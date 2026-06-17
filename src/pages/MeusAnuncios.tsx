import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box, ArrowLeft, Plus, Loader2, Trash2, Pencil, Megaphone, PackageOpen, Eye, Info, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PaywallDialog } from "@/components/marketplace/PaywallDialog";
import { PixCheckoutDialog } from "@/components/marketplace/PixCheckoutDialog";
import { DESTAQUE_PLANS, LIMITE_GRATIS, formatBRL } from "@/config/marketplacePlans";
import { trackMarketplaceEvent } from "@/lib/marketplaceAnalytics";

const CATEGORIAS = [
  "Cimento e Argamassa", "Aço e Ferragens", "Tijolos e Blocos", "Areia e Pedra",
  "Hidráulica", "Elétrica", "Acabamentos",
];
const UNIDADES = ["un", "m", "m²", "m³", "kg", "saco", "caixa", "pç", "L"];

const fallbackImage =
  "https://images.unsplash.com/photo-1541888081622-132d718b52f6?q=80&w=400&auto=format&fit=crop";

const isAtivoDestaque = (a: any) =>
  a.is_featured && a.featured_until && new Date(a.featured_until) > new Date();

export default function MeusAnuncios() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [anuncios, setAnuncios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [destaqueProduto, setDestaqueProduto] = useState<any | null>(null);
  const [planoDestaque, setPlanoDestaque] = useState(DESTAQUE_PLANS[0]);
  const [destaqueConfirmado, setDestaqueConfirmado] = useState(false);

  const [status, setStatus] = useState({ active_count: 0, free_limit: LIMITE_GRATIS, is_pro: false, can_publish: true });

  const [form, setForm] = useState({
    id: "", nome_produto: "", categoria: CATEGORIAS[0], preco: "", unidade_medida: "un", foto_url: "",
  });

  const carregar = useCallback(async () => {
    if (!user) return;
    try {
      const [{ data: prods, error }, { data: st }] = await Promise.all([
        supabase.from("produtos_loja").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.rpc("get_publish_status", { _user_id: user.id }),
      ]);
      if (error) throw error;
      setAnuncios(prods || []);
      if (st && st[0]) setStatus(st[0] as typeof status);
    } catch {
      toast.error("Não foi possível carregar seus anúncios.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { carregar(); }, [carregar]);

  const restantes = Math.max(0, status.free_limit - status.active_count);
  const podePublicar = status.is_pro || status.can_publish;

  const abrirNovo = async () => {
    if (!user) return;
    // Validação de limite no servidor (gatilho de paywall)
    const { data } = await supabase.rpc("get_publish_status", { _user_id: user.id });
    const fresh = data?.[0];
    if (fresh) setStatus(fresh as typeof status);
    if (fresh && !fresh.is_pro && !fresh.can_publish) {
      setPaywallOpen(true);
      return;
    }
    setForm({ id: "", nome_produto: "", categoria: CATEGORIAS[0], preco: "", unidade_medida: "un", foto_url: "" });
    setModalAberto(true);
  };

  const abrirEdicao = (a: any) => {
    setForm({
      id: a.id, nome_produto: a.nome_produto, categoria: a.categoria,
      preco: String(a.preco), unidade_medida: a.unidade_medida, foto_url: a.foto_url || "",
    });
    setModalAberto(true);
  };

  const abrirDestaque = (a: any) => {
    setPlanoDestaque(DESTAQUE_PLANS[0]);
    setDestaqueConfirmado(false);
    setDestaqueProduto(a);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.nome_produto.trim() || !form.preco) {
      toast.error("Preencha o nome e o preço do material.");
      return;
    }
    setSalvando(true);
    try {
      const isEdicao = form.id !== "";
      const payload = {
        nome_produto: form.nome_produto.trim(),
        categoria: form.categoria,
        preco: Number(form.preco),
        unidade_medida: form.unidade_medida,
        foto_url: form.foto_url.trim() || null,
      };
      if (isEdicao) {
        const { error } = await supabase.from("produtos_loja").update(payload).eq("id", form.id);
        if (error) throw error;
        setAnuncios((prev) => prev.map((a) => (a.id === form.id ? { ...a, ...payload } : a)));
        toast.success("Anúncio atualizado!");
      } else {
        const { data, error } = await supabase
          .from("produtos_loja").insert([{ user_id: user.id, status: "ativo", ...payload }]).select();
        if (error) throw error;
        if (data) setAnuncios((prev) => [data[0], ...prev]);
        toast.success("Anúncio publicado!");
        carregar();
      }
      setModalAberto(false);
    } catch {
      toast.error("Erro ao salvar o anúncio.");
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este anúncio?")) return;
    try {
      const { error } = await supabase.from("produtos_loja").delete().eq("id", id);
      if (error) throw error;
      setAnuncios((prev) => prev.filter((a) => a.id !== id));
      toast.success("Anúncio removido.");
      carregar(); // libera o limite gratuito dinamicamente
    } catch {
      toast.error("Erro ao remover o anúncio.");
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
  const pct = Math.min(100, (status.active_count / status.free_limit) * 100);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <Box className="h-6 w-6 text-emerald-600" /> <span>Obra Link</span>
          </Link>
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Painel
          </Button>
        </div>
      </nav>

      <main className="container max-w-5xl mx-auto px-4 lg:px-8 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3"><Megaphone className="h-6 w-6 text-emerald-600" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Meus Anúncios</h1>
              <p className="text-slate-500 text-sm">Venda materiais avulsos diretamente no Marketplace.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild className="border-slate-200 text-slate-600">
              <Link to={`/vendedor/${user.id}`}><Eye className="mr-2 h-4 w-4" /> Ver meu perfil</Link>
            </Button>
            <Button onClick={abrirNovo} className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" /> Novo Anúncio
            </Button>
          </div>
        </div>

        {/* Contador de consumo em destaque */}
        <Card className="mb-6 border-slate-200">
          <CardContent className="p-5">
            {status.is_pro ? (
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-semibold text-slate-900">Plano Profissional ativo</p>
                  <p className="text-sm text-slate-500">Você tem publicações ilimitadas. {status.active_count} anúncios publicados.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Info className="h-4 w-4 text-emerald-600" /> Plano gratuito
                  </p>
                  <p className="text-sm font-bold text-slate-900">{status.active_count} / {status.free_limit}</p>
                </div>
                <Progress value={pct} className="h-2" />
                <p className="mt-2 text-sm text-slate-500">
                  {restantes > 0
                    ? `Você possui ${restantes} de ${status.free_limit} publicações gratuitas restantes.`
                    : "Você atingiu o limite gratuito. Faça upgrade para publicar mais."}
                </p>
                {restantes <= 2 && (
                  <Button variant="link" className="px-0 text-emerald-700" onClick={() => setPaywallOpen(true)}>
                    Conhecer o plano Profissional →
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
        ) : anuncios.length === 0 ? (
          <Card className="border-dashed py-16 text-center">
            <CardContent className="flex flex-col items-center">
              <PackageOpen className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Você ainda não tem anúncios</h3>
              <p className="mb-6 max-w-md text-slate-500">Publique seus materiais avulsos para que compradores possam encontrá-los no Marketplace.</p>
              <Button onClick={abrirNovo} className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" /> Publicar meu primeiro anúncio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {anuncios.map((a) => {
              const destacado = isAtivoDestaque(a);
              return (
                <Card key={a.id} className={`overflow-hidden bg-white ${destacado ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"}`}>
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100 relative">
                    <img src={a.foto_url || fallbackImage} alt={a.nome_produto} loading="lazy" className="h-full w-full object-cover" />
                    {destacado && (
                      <Badge className="absolute top-2 left-2 bg-amber-500 text-white hover:bg-amber-500">
                        <Sparkles className="h-3 w-3 mr-1" /> Destaque
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="outline" className="mb-2 text-xs text-slate-500">{a.categoria}</Badge>
                    <h3 className="font-semibold text-slate-900 leading-tight line-clamp-2">{a.nome_produto}</h3>
                    <p className="mt-1 text-emerald-600 font-bold">
                      {formatBRL(Number(a.preco))} <span className="text-xs font-normal text-slate-400">/ {a.unidade_medida}</span>
                    </p>
                    {destacado && (
                      <p className="mt-1 text-xs text-amber-600">
                        Destaque até {new Date(a.featured_until).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 border-slate-200" onClick={() => abrirEdicao(a)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button size="icon" variant="outline" className="border-slate-200 text-red-500 hover:bg-red-50" onClick={() => handleDeletar(a.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {!destacado && (
                      <Button size="sm" className="mt-2 w-full bg-amber-500 text-white hover:bg-amber-600" onClick={() => abrirDestaque(a)}>
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Destacar anúncio
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de anúncio */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar anúncio" : "Novo anúncio"}</DialogTitle>
            <DialogDescription>Materiais avulsos publicados por {nomeVendedor}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvar} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome do material *</Label>
              <Input id="nome" value={form.nome_produto} onChange={(e) => setForm((f) => ({ ...f, nome_produto: e.target.value }))} placeholder="Ex.: Saco de cimento CP-II 50kg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria *</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unidade *</Label>
                <Select value={form.unidade_medida} onValueChange={(v) => setForm((f) => ({ ...f, unidade_medida: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="preco">Preço (R$) *</Label>
              <Input id="preco" type="number" step="0.01" min="0" value={form.preco} onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))} placeholder="0,00" />
            </div>
            <div>
              <Label htmlFor="foto">Foto (URL) — opcional</Label>
              <Input id="foto" value={form.foto_url} onChange={(e) => setForm((f) => ({ ...f, foto_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando} className="bg-emerald-600 text-white hover:bg-emerald-700">
                {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {form.id ? "Salvar" : "Publicar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Paywall (upgrade para Pro) */}
      <PaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} onUpgraded={carregar} />

      {/* Checkout de destaque por produto */}
      {destaqueProduto && (
        <Dialog open={!!destaqueProduto && !destaqueConfirmado} onOpenChange={(v) => !v && setDestaqueProduto(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Destacar anúncio</DialogTitle>
              <DialogDescription>Apareça no topo do Marketplace e venda mais rápido.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {DESTAQUE_PLANS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => { setPlanoDestaque(p); setDestaqueConfirmado(true); }}
                  className="w-full flex items-center justify-between rounded-lg border border-slate-200 p-4 text-left hover:border-emerald-400 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{p.label}</p>
                    {p.badge && <span className="text-xs text-emerald-600">{p.badge}</span>}
                  </div>
                  <span className="font-bold text-slate-900">{formatBRL(p.valor)}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {destaqueProduto && destaqueConfirmado && (
        <PixCheckoutDialog
          open
          onOpenChange={(v) => { if (!v) { setDestaqueProduto(null); setDestaqueConfirmado(false); setPlanoDestaque(DESTAQUE_PLANS[0]); } }}
          purpose="destaque_produto"
          plan={planoDestaque}
          targetId={destaqueProduto.id}
          title={`Destacar "${destaqueProduto.nome_produto}"`}
          description="Pague via Pix e seu anúncio sobe ao topo automaticamente."
          onPaid={() => { trackMarketplaceEvent({ eventType: "feature_conversion", targetType: "produto", targetId: destaqueProduto.id, isFeatured: true }); carregar(); }}
        />
      )}
    </div>
  );
}
