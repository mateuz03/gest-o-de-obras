import { useEffect, useState } from "react";
import { Sparkles, Loader2, Store, Package, ShieldCheck, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Destaque {
  type: "produto" | "loja";
  id: string;
  nome: string;
  is_featured: boolean;
  featured_until: string | null;
}

export default function Destaques() {
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<Destaque[]>([]);
  const [editando, setEditando] = useState<Destaque | null>(null);
  const [novaData, setNovaData] = useState("");
  const [novoStatus, setNovoStatus] = useState(true);
  const [justificativa, setJustificativa] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [{ data: prods }, { data: lojas }] = await Promise.all([
        supabase.from("produtos_loja").select("id, nome_produto, is_featured, featured_until")
          .or("is_featured.eq.true,featured_until.not.is.null").order("featured_until", { ascending: false }),
        supabase.from("perfil_lojista").select("user_id, nome_loja, is_premium, featured_until")
          .or("is_premium.eq.true,featured_until.not.is.null").order("featured_until", { ascending: false }),
      ]);
      const lista: Destaque[] = [
        ...(prods || []).map((p: any) => ({ type: "produto" as const, id: p.id, nome: p.nome_produto, is_featured: p.is_featured, featured_until: p.featured_until })),
        ...(lojas || []).map((l: any) => ({ type: "loja" as const, id: l.user_id, nome: l.nome_loja, is_featured: l.is_premium, featured_until: l.featured_until })),
      ];
      setItens(lista);
    } catch {
      toast.error("Erro ao carregar destaques.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const abrir = (d: Destaque) => {
    setEditando(d);
    setNovoStatus(d.is_featured);
    setNovaData(d.featured_until ? new Date(d.featured_until).toISOString().slice(0, 16) : "");
    setJustificativa("");
  };

  const salvar = async () => {
    if (!editando) return;
    if (justificativa.trim().length < 3) { toast.error("Informe uma justificativa de auditoria."); return; }
    setSalvando(true);
    try {
      const { error } = await supabase.rpc("admin_override_featured", {
        _target_type: editando.type,
        _target_id: editando.id,
        _is_featured: novoStatus,
        _featured_until: novaData ? new Date(novaData).toISOString() : null,
        _justificativa: justificativa.trim(),
      });
      if (error) throw error;
      toast.success("Destaque atualizado.");
      setEditando(null);
      carregar();
    } catch (e: any) {
      toast.error("Não foi possível atualizar (verifique permissões/justificativa).");
    } finally {
      setSalvando(false);
    }
  };

  const ativo = (d: Destaque) => d.is_featured && d.featured_until && new Date(d.featured_until) > new Date();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Backoffice</p>
          <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-amber-500" /> Gerenciamento de Destaques
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
      ) : (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Recurso</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Expira em</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itens.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Nenhum destaque registrado ainda.</td></tr>
                )}
                {itens.map((d) => (
                  <tr key={`${d.type}-${d.id}`} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-900">{d.nome}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="gap-1">
                        {d.type === "loja" ? <Store className="h-3 w-3" /> : <Package className="h-3 w-3" />} {d.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {ativo(d)
                        ? <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Destaque ativo</Badge>
                        : <Badge variant="outline" className="text-slate-500">Expirado / inativo</Badge>}
                    </td>
                    <td className="px-6 py-4 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {d.featured_until ? new Date(d.featured_until).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => abrir(d)}>Ajustar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={!!editando} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Ajuste manual de destaque</DialogTitle>
            <DialogDescription>{editando?.nome} — toda alteração é registrada na auditoria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="ativo" checked={novoStatus} onChange={(e) => setNovoStatus(e.target.checked)} className="h-4 w-4" />
              <Label htmlFor="ativo">Destaque ativo</Label>
            </div>
            <div>
              <Label htmlFor="data">Destacado até</Label>
              <Input id="data" type="datetime-local" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="just">Justificativa interna (auditoria) *</Label>
              <Textarea id="just" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Ex.: Cortesia por instabilidade no pagamento." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700">
              {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
