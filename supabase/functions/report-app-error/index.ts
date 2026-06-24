import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

import {
  corsHeaders,
  createServiceRoleClient,
  getClientUserAgent,
  json,
  requireMethod,
  toErrorResponse,
} from "../_shared/security.ts";

const BodySchema = z.object({
  source: z.string().trim().min(2).max(80),
  severity: z.enum(["info", "warning", "error", "critical"]).default("error"),
  message: z.string().trim().min(3).max(300),
  metadata: z.record(z.unknown()).optional().default({}),
});

async function resolveActorUserId(req: Request) {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await authClient.auth.getUser();
    if (error || !data?.user?.id) {
      return null;
    }
    return data.user.id;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    requireMethod(req, "POST");

    let body;
    try {
      body = BodySchema.parse(await req.json());
    } catch {
      return json({ ok: true });
    }

    const adminClient = createServiceRoleClient();
    const actorUserId = await resolveActorUserId(req);
    const userAgent = getClientUserAgent(req);

    const { error } = await adminClient.from("app_error_events").insert({
      source: body.source,
      function_name: "client-runtime",
      severity: body.severity,
      error_code: null,
      message: body.message,
      request_path: new URL(req.url).pathname,
      request_method: req.method,
      actor_user_id: actorUserId,
      metadata: {
        ...body.metadata,
        userAgent,
      },
    });

    if (error) {
      throw error;
    }

    return json({ ok: true });
  } catch (error) {
    return await toErrorResponse(error, "Nao foi possivel registrar a falha.", {
      functionName: "report-app-error",
      request: req,
      source: "edge",
    });
  }
});
