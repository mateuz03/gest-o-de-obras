-- ───────────────────────────────────────────────────────────────
-- 1. Tabela de idempotência de webhooks
-- ───────────────────────────────────────────────────────────────
CREATE TABLE public.webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway text NOT NULL DEFAULT 'mercadopago',
  event_id text NOT NULL,
  topic text,
  status text NOT NULL DEFAULT 'processing',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gateway, event_id)
);

GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin ve eventos de webhook"
  ON public.webhook_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_webhook_events_updated_at
  BEFORE UPDATE ON public.webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ───────────────────────────────────────────────────────────────
-- 2. Reserva atômica de um evento de webhook (trava de idempotência)
--    Retorna: 'new' (primeiro processamento), 'retry' (reprocessar após falha),
--             'duplicate' (já concluído — ignorar).
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_webhook_event(_gateway text, _event_id text, _topic text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing public.webhook_events%ROWTYPE;
BEGIN
  SELECT * INTO existing FROM public.webhook_events
    WHERE gateway = _gateway AND event_id = _event_id
    FOR UPDATE;

  IF FOUND THEN
    IF existing.status = 'done' THEN
      RETURN 'duplicate';
    END IF;
    UPDATE public.webhook_events
      SET attempts = attempts + 1, status = 'processing', updated_at = now()
      WHERE id = existing.id;
    RETURN 'retry';
  END IF;

  INSERT INTO public.webhook_events (gateway, event_id, topic, status, attempts)
    VALUES (_gateway, _event_id, _topic, 'processing', 1);
  RETURN 'new';
END;
$$;

-- ───────────────────────────────────────────────────────────────
-- 3. Marca o resultado final do processamento do evento
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_webhook_event(_gateway text, _event_id text, _status text, _error text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.webhook_events
    SET status = _status, last_error = _error, updated_at = now()
    WHERE gateway = _gateway AND event_id = _event_id;
END;
$$;

-- ───────────────────────────────────────────────────────────────
-- 4. Relatório de CTR: destacados vs orgânicos (restrito a admin)
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_marketplace_ctr(_days integer DEFAULT 30)
RETURNS TABLE(listing text, impressions bigint, clicks bigint, ctr numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      CASE WHEN e.is_featured THEN 'featured' ELSE 'organic' END AS listing,
      e.event_type
    FROM public.marketplace_events e
    WHERE e.created_at >= now() - (_days || ' days')::interval
      AND e.event_type IN ('item_impression', 'item_click')
  )
  SELECT
    b.listing,
    count(*) FILTER (WHERE b.event_type = 'item_impression') AS impressions,
    count(*) FILTER (WHERE b.event_type = 'item_click') AS clicks,
    round(
      CASE
        WHEN count(*) FILTER (WHERE b.event_type = 'item_impression') = 0 THEN 0
        ELSE count(*) FILTER (WHERE b.event_type = 'item_click')::numeric
             / count(*) FILTER (WHERE b.event_type = 'item_impression') * 100
      END, 2) AS ctr
  FROM base b
  GROUP BY b.listing;
END;
$$;