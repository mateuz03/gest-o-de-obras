import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Megaphone,
  PackageOpen,
  Eye,
  Info,
  Sparkles,
  Rocket,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PaywallDialog } from "@/components/marketplace/PaywallDialog";
import { PixCheckoutDialog } from "@/components/marketplace/PixCheckoutDialog";
import { DESTAQUE_PLANS, LIMITE_GRATIS, formatBRL } from "@/config/marketplacePlans";
import { trackMarketplaceEvent } from "@/lib/marketplaceAnalytics";
import { isHighlightActive, highlightDaysLeft } from "@/lib/featured";

const CATEGORIAS = [
  "Cimento e Argamassa",
  "Aco e Ferragens",
  "Tijolos e Blocos",
  "Areia e Pedra",
  "Hidraulica",
  "Eletrica",
  "Acabamentos",
];

const UNIDADES = ["un", "m", "m2", "m3", "kg", "saco", "caixa", "pc", "L"];

const fallbackImage =
  "https://images.unsplash.com/photo-1541888081622-132d718b52f6?q=80&w=400&auto=format&fit=crop";

interface MarketplaceStatus {
  active_count: number;
  free_limit: number;
  is_pro: boolean;
  can_publish: boolean;
}

interface MarketplaceAd {
  categoria: string;
  featured_until?: string | null;
  foto_url?: string | null;
  id: string;
  is_featured?: boolean | null;
  nome_produto: string;
  preco: number;
  unidade_medida: string;
}

export default function MeusAnuncios() {
  const { user, profile } = useAuth();

  const [anuncios, setAnuncios] = useState<MarketplaceAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [destaqueProduto, setDestaqueProduto] = useState<MarketplaceAd | null>(null);
  const [planoDestaque, setPlanoDestaque] = useState(DESTAQUE_PLANS[0]);
  const [destaqueConfirmado, setDestaqueConfirmado] = useState(false);
  const [sucessoProduto, setSucessoProduto] = useState<MarketplaceAd | null>(null);

  const [status, setStatus] = useState<MarketplaceStatus>({
    active_count: 0,
    free_limit: LIMITE_GRATIS,
    is_pro: false,
    can_publish: true,
  });

  const [form, setForm] = useState({
    id: "",
    nome_produto: "",
    categoria: CATEGORIAS[0],
    preco: "",
    unidade_medida: "un",
    foto_url: "",
  });

  const carregar = useCallback(async () => {
    if (!user) return;

    try {
      const [{ data: prods, error }, { data: st, error: statusError }] = await Promise.all([
        supabase
          .from("produtos_loja")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_publish_status", { _user_id: user.id }),
      ]);

      if (error) throw error;
      if (statusError) throw statusError;

      setAnuncios(
        (prods || []).map((produto) => ({
          ...produto,
          preco: Number(produto.preco),
        }))
      );

      if (st && st[0]) {
        setStatus(st[0] as MarketplaceStatus);
      } else {
        const activeCount = (prods || []).filter((anuncio) => anuncio.status === "ativo").length;
        setStatus({
          active_count: activeCount,
          free_limit: LIMITE_GRATIS,
          is_pro: false,
          can_publish: activeCount < LIMITE_GRATIS,
        });
      }
    } catch {
      toast.error("Nao foi possivel carregar seus anuncios.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const restantes = Math.max(0, status.free_limit - status.active_count);

  const abrirNovo = async () => {
    if (!user) return;

    const { data, error } = await supabase.rpc("get_publish_status", { _user_id: user.id });
    if (error) {
      toast.error("Nao foi possivel validar seu limite agora.");
      return;
    }

    const fresh = data?.[0] as MarketplaceStatus | undefined;
    if (fresh) setStatus(fresh);

    const effective = fresh || status;
    if (!effective.can_publish) {
      setPaywallOpen(true);
      return;
    }

    setForm({
      id: "",
      nome_produto: "",
      categoria: CATEGORIAS[0],
      preco: "",
      unidade_medida: "un",
      foto_url: "",
    });
    setModalAberto(true);
  };

  const abrirEdicao = (anuncio: MarketplaceAd) => {
    setForm({
      id: anuncio.id,
      nome_produto: anuncio.nome_produto,
      categoria: anuncio.categoria,
      preco: String(anuncio.preco),
      unidade_medida: anuncio.unidade_medida,
      foto_url: anuncio.foto_url || "",
    });
    setModalAberto(true);
  };

  const abrirDestaque = (anuncio: MarketplaceAd) => {
    setPlanoDestaque(DESTAQUE_PLANS[0]);
    setDestaqueConfirmado(false);
    setDestaqueProduto(anuncio);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.nome_produto.trim() || !form.preco) {
      toast.error("Preencha o nome e o preco do material.");
      return;
    }

    setSalvando(true);
    try {
      const isEdicao = form.id !== "";
      const { data, error } = await supabase.rpc("upsert_marketplace_product", {
        _id: isEdicao ? form.id : null,
        _nome_produto: form.nome_produto.trim(),
        _categoria: form.categoria,
        _preco: Number(form.preco),
        _unidade_medida: form.unidade_medida,
        _foto_url: form.foto_url.trim() || null,
      });

      if (error) throw error;

      const salvo: MarketplaceAd | null = data
        ? {
            ...data,
            preco: Number(data.preco),
          }
        : null;

      toast.success(isEdicao ? "Anuncio atualizado!" : "Anuncio publicado!");
      setModalAberto(false);
      await carregar();

      if (!isEdicao && salvo) {
        setSucessoProduto(salvo);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("publish_limit_exceeded")) {
        setPaywallOpen(true);
        toast.error("Voce atingiu o limite do seu plano atual.");
      } else {
        toast.error("Erro ao salvar o anuncio.");
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este anuncio?")) return;

    try {
      const { data, error } = await supabase.rpc("delete_marketplace_product", { _id: id });
      if (error) throw error;
      if (!data) throw new Error("delete_failed");

      toast.success("Anuncio removido.");
      await carregar();
    } catch {
      toast.error("Erro ao remover o anuncio.");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const nomeVendedor = profile?.nome_completo || profile?.nome || "Vendedor";
  const pct = status.free_limit > 0 ? Math.min(100, (status.active_count / status.free_limit) * 100) : 100;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <main className="container max-w-5xl mx-auto px-4 lg:px-8 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3">
              <Megaphone className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Meus Anuncios</h1>
              <p className="text-slate-500 text-sm">
                Venda materiais avulsos diretamente no Marketplace.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild className="border-slate-200 text-slate-600">
              <Link to={`/vendedor/${user.id}`}>
                <Eye className="mr-2 h-4 w-4" /> Ver meu perfil
              </Link>
            </Button>
            <Button onClick={abrirNovo} className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" /> Novo Anuncio
            </Button>
          </div>
        </div>

        <Card className="mb-6 border-slate-200">
          <CardContent className="p-5">
            {status.is_pro ? (
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-semibold text-slate-900">Plano Profissional ativo</p>
                  <p className="text-sm text-slate-500">
                    Voce tem publicacoes ilimitadas. {status.active_count} anuncios publicados.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Info className="h-4 w-4 text-emerald-600" /> Plano gratuito
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {status.active_count} / {status.free_limit}
                  </p>
                </div>
                <Progress value={pct} className="h-2" />
                <p className="mt-2 text-sm text-slate-500">
                  {restantes > 0
                    ? `Voce possui ${restantes} de ${status.free_limit} publicacoes gratuitas restantes.`
                    : "Voce atingiu o limite gratuito. Faca upgrade para publicar mais."}
                </p>
                {restantes <= 2 && (
                  <Button
                    variant="link"
                    className="px-0 text-emerald-700"
                    onClick={() => setPaywallOpen(true)}
                  >
                    Conhecer o plano Profissional -&gt;
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : anuncios.length === 0 ? (
          <Card className="border-dashed py-16 text-center">
            <CardContent className="flex flex-col items-center">
              <PackageOpen className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Voce ainda nao tem anuncios
              </h3>
              <p className="mb-6 max-w-md text-slate-500">
                Publique seus materiais avulsos para que compradores possam encontra-los no
                Marketplace.
              </p>
              <Button onClick={abrirNovo} className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" /> Publicar meu primeiro anuncio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {anuncios.map((anuncio) => {
              const destacado = isHighlightActive(anuncio.is_featured, anuncio.featured_until);
              const diasRestantes = highlightDaysLeft(anuncio.featured_until);

              return (
                <Card
                  key={anuncio.id}
                  className={`overflow-hidden bg-white transition-all ${
                    destacado ? "border-amber-300 ring-1 ring-amber-200 shadow-md" : "border-slate-200"
                  }`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={anuncio.foto_url || fallbackImage}
                      alt={anuncio.nome_produto}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    {destacado && (
                      <Badge className="absolute left-2 top-2 gap-1 border-0 bg-amber-500 text-white shadow-sm hover:bg-amber-500">
                        <Sparkles className="h-3 w-3" /> Em destaque
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="outline" className="mb-2 text-xs text-slate-500">
                      {anuncio.categoria}
                    </Badge>
                    <h3 className="font-semibold text-slate-900 leading-tight line-clamp-2">
                      {anuncio.nome_produto}
                    </h3>
                    <p className="mt-1 text-emerald-600 font-bold">
                      {formatBRL(Number(anuncio.preco))}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        / {anuncio.unidade_medida}
                      </span>
                    </p>

                    {destacado ? (
                      <p className="mt-2 text-xs font-medium text-amber-600">
                        {diasRestantes > 0
                          ? `Destaque ativo - ${diasRestantes} ${
                              diasRestantes === 1 ? "dia restante" : "dias restantes"
                            }`
                          : "Destaque ativo"}
                      </p>
                    ) : (
                      <Button
                        size="sm"
                        className="mt-3 w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm hover:from-amber-600 hover:to-amber-700"
                        onClick={() => abrirDestaque(anuncio)}
                      >
                        <Rocket className="mr-1.5 h-3.5 w-3.5" /> Destacar anuncio
                      </Button>
                    )}

                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-slate-200"
                        onClick={() => abrirEdicao(anuncio)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="border-slate-200 text-red-500 hover:bg-red-50"
                        onClick={() => handleDeletar(anuncio.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!sucessoProduto} onOpenChange={(open) => !open && setSucessoProduto(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="items-center text-center">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <PartyPopper className="h-7 w-7 text-emerald-600" />
            </div>
            <DialogTitle className="text-xl">Anuncio publicado!</DialogTitle>
            <DialogDescription>
              "{sucessoProduto?.nome_produto}" ja esta no Marketplace. Que tal turbinar a
              visibilidade?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Destaque seu anuncio e venda mais rapido!
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Apareca no topo do feed com um card que chama atencao dos compradores.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"
              onClick={() => {
                const alvo = sucessoProduto;
                setSucessoProduto(null);
                if (alvo) abrirDestaque(alvo);
              }}
            >
              <Rocket className="mr-2 h-4 w-4" /> Destacar agora
            </Button>
            <Button variant="ghost" className="w-full text-slate-500" onClick={() => setSucessoProduto(null)}>
              Agora nao
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar anuncio" : "Novo anuncio"}</DialogTitle>
            <DialogDescription>Materiais avulsos publicados por {nomeVendedor}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvar} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome do material *</Label>
              <Input
                id="nome"
                value={form.nome_produto}
                onChange={(e) => setForm((prev) => ({ ...prev, nome_produto: e.target.value }))}
                placeholder="Ex.: Saco de cimento CP-II 50kg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria *</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, categoria: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((categoria) => (
                      <SelectItem key={categoria} value={categoria}>
                        {categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unidade *</Label>
                <Select
                  value={form.unidade_medida}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, unidade_medida: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((unidade) => (
                      <SelectItem key={unidade} value={unidade}>
                        {unidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="preco">Preco (R$) *</Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                min="0"
                value={form.preco}
                onChange={(e) => setForm((prev) => ({ ...prev, preco: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="foto">Foto (URL) - opcional</Label>
              <Input
                id="foto"
                value={form.foto_url}
                onChange={(e) => setForm((prev) => ({ ...prev, foto_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando} className="bg-emerald-600 text-white hover:bg-emerald-700">
                {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {form.id ? "Salvar" : "Publicar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} onUpgraded={carregar} />

      {destaqueProduto && (
        <Dialog
          open={!!destaqueProduto && !destaqueConfirmado}
          onOpenChange={(open) => !open && setDestaqueProduto(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Destacar anuncio</DialogTitle>
              <DialogDescription>Apareca no topo do Marketplace e venda mais rapido.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {DESTAQUE_PLANS.map((plano) => (
                <button
                  key={plano.key}
                  onClick={() => {
                    setPlanoDestaque(plano);
                    setDestaqueConfirmado(true);
                  }}
                  className="w-full flex items-center justify-between rounded-lg border border-slate-200 p-4 text-left hover:border-emerald-400 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{plano.label}</p>
                    {plano.badge && <span className="text-xs text-emerald-600">{plano.badge}</span>}
                  </div>
                  <span className="font-bold text-slate-900">{formatBRL(plano.valor)}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {destaqueProduto && destaqueConfirmado && (
        <PixCheckoutDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setDestaqueProduto(null);
              setDestaqueConfirmado(false);
              setPlanoDestaque(DESTAQUE_PLANS[0]);
            }
          }}
          purpose="destaque_produto"
          plan={planoDestaque}
          targetId={destaqueProduto.id}
          title={`Destacar "${destaqueProduto.nome_produto}"`}
          description="Pague via Pix e seu anuncio sobe ao topo automaticamente."
          onPaid={() => {
            trackMarketplaceEvent({
              eventType: "feature_conversion",
              targetType: "produto",
              targetId: destaqueProduto.id,
              isFeatured: true,
            });
            void carregar();
          }}
        />
      )}
    </div>
  );
}
