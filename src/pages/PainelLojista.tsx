import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Store, 
  Package, 
  MessageCircle, 
  Plus, 
  Box, 
  LogOut, 
  Loader2, 
  Trash2,
  TrendingUp,
  Save,
  Pencil,
  Info,
  MapPin,
  Clock,
  Instagram,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UpgradeDialog } from "@/components/marketplace/UpgradeDialog";
import { isHighlightActive } from "@/lib/featured";
import { Sparkles, Rocket } from "lucide-react";

// Helpers de Máscara
const maskPhone = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11)
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");

const maskCNPJ = (v: string) =>
  v.replace(/\D/g, "").slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");

export default function PainelLojista() {
  const { user, accountType, profileLoading } = useAuth();
  const navigate = useNavigate();

  // Bloqueio: a criação/gestão de loja é exclusiva de contas CNPJ (Pessoa Jurídica)
  useEffect(() => {
    if (user && !profileLoading && accountType === "CPF") {
      toast.error("A criação de loja é exclusiva para contas CNPJ (Pessoa Jurídica).");
      navigate("/meus-anuncios", { replace: true });
    }
  }, [user, accountType, profileLoading, navigate]);
  
  const [abaAtiva, setAbaAtiva] = useState<"catalogo" | "perfil" | "oportunidades">("catalogo");
  
  // ─── ESTADOS DO CATÁLOGO ───
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvandoProduto, setSalvandoProduto] = useState(false);
  const [formProduto, setFormProduto] = useState({ id: "", nome_produto: "", categoria: "Cimento e Argamassa", preco: "", unidade_medida: "un" });

  // ─── ESTADOS DO PERFIL ───
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [perfil, setPerfil] = useState({
    nome_loja: "",
    cnpj: "",
    whatsapp: "",
    cidade: "",
    estado: "SP",
    descricao: "",
    instagram: "",
    horario_atendimento: "",
    categoria: "",
    logo_url: ""
  });

  // Calcula % de preenchimento
  const camposObrigatorios = ['nome_loja', 'cnpj', 'whatsapp', 'cidade', 'descricao'];
  const preenchidos = camposObrigatorios.filter(key => perfil[key as keyof typeof perfil]?.trim() !== "").length;
  const progressoPerfil = Math.round((preenchidos / camposObrigatorios.length) * 100);

  // ─── BUSCAR DADOS ───
  useEffect(() => {
    if (!user) return;
    
    async function carregarDados() {
      try {
        const { data: dataProd } = await supabase.from("produtos_loja").select("*").eq("user_id", user?.id).order("created_at", { ascending: false });
        if (dataProd) setProdutos(dataProd);

        const { data: dataPerfil } = await supabase.from("perfil_lojista").select("*").eq("user_id", user?.id).maybeSingle();
        if (dataPerfil) {
          setPerfil({
            nome_loja: dataPerfil.nome_loja || "",
            cnpj: dataPerfil.cnpj || "",
            whatsapp: dataPerfil.whatsapp || "",
            cidade: dataPerfil.cidade || "",
            estado: dataPerfil.estado || "SP",
            descricao: dataPerfil.descricao || "",
            instagram: dataPerfil.instagram || "",
            horario_atendimento: dataPerfil.horario_atendimento || "",
            categoria: dataPerfil.categoria || "",
            logo_url: dataPerfil.logo_url || ""
          });
        }
      } catch (error) {
        toast.error("Erro ao carregar o painel.");
      } finally {
        setLoadingProdutos(false);
        setLoadingPerfil(false);
      }
    }
    carregarDados();
  }, [user]);

  // ─── SALVAR PERFIL ───
  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSalvandoPerfil(true);
    
    try {
      const { error } = await supabase.from("perfil_lojista").upsert({
          user_id: user.id,
          ...perfil,
          status: "ativo"
        }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Alterações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar os dados.");
    } finally {
      setSalvandoPerfil(false);
    }
  };

  // ─── FUNÇÕES DO CATÁLOGO ───
  const abrirModalNovo = () => { 
    setFormProduto({ id: "", nome_produto: "", categoria: "Cimento e Argamassa", preco: "", unidade_medida: "un" }); 
    setModalAberto(true); 
  };

  const abrirModalEdicao = (p: any) => { 
    setFormProduto({ id: p.id, nome_produto: p.nome_produto, categoria: p.categoria, preco: String(p.preco), unidade_medida: p.unidade_medida }); 
    setModalAberto(true); 
  };

  const handleSalvarProduto = async (e: React.FormEvent) => { 
    e.preventDefault();
    if (!user) return;
    setSalvandoProduto(true);
    
    try {
      const isEdicao = formProduto.id !== "";

      if (!isEdicao && produtos.length >= 50) {
        toast.error("Limite atingido! Você já possui 50 produtos no plano básico.");
        setSalvandoProduto(false);
        return;
      }

      if (isEdicao) {
        // UPDATE
        const { error } = await supabase.from("produtos_loja").update({
            nome_produto: formProduto.nome_produto,
            categoria: formProduto.categoria,
            preco: Number(formProduto.preco),
            unidade_medida: formProduto.unidade_medida,
          }).eq("id", formProduto.id);

        if (error) throw error;

        setProdutos(produtos.map(p => p.id === formProduto.id ? { 
          ...p, nome_produto: formProduto.nome_produto, categoria: formProduto.categoria, preco: Number(formProduto.preco), unidade_medida: formProduto.unidade_medida 
        } : p));
        toast.success("Produto atualizado com sucesso!");

      } else {
        // INSERT
        const { data, error } = await supabase.from("produtos_loja").insert([{
              user_id: user.id,
              nome_produto: formProduto.nome_produto,
              categoria: formProduto.categoria,
              preco: Number(formProduto.preco),
              unidade_medida: formProduto.unidade_medida,
              status: "ativo"
          }]).select();

        if (error) throw error;

        if (data) {
          setProdutos([data[0], ...produtos]);
          toast.success("Produto adicionado ao catálogo!");
        }
      }
      setModalAberto(false);
    } catch (error) {
      toast.error("Erro ao salvar produto.");
    } finally {
      setSalvandoProduto(false);
    }
  };

  const deletarProduto = async (id: string) => { 
    if (!confirm("Tem certeza que deseja apagar este produto?")) return; 
    try {
        const { error } = await supabase.from("produtos_loja").delete().eq("id", id);
        if (error) throw error;
        setProdutos(produtos.filter(p => p.id !== id)); 
        toast.success("Produto removido.");
    } catch (error) {
        toast.error("Erro ao remover produto.");
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans text-slate-900">
      
      {/* ─── SIDEBAR ─── */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10 md:min-h-screen">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <Box className="h-8 w-8 text-emerald-500" />
          <span className="font-bold text-xl text-white tracking-tight">Obra Link<span className="text-emerald-500 text-xs ml-1 align-top">Lojas</span></span>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          <button onClick={() => setAbaAtiva("perfil")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${abaAtiva === "perfil" ? "bg-emerald-600/10 text-emerald-400 font-medium" : "hover:bg-slate-800 hover:text-white"}`}>
            <Store className="w-5 h-5" /> Perfil da Loja
          </button>
          <button onClick={() => setAbaAtiva("catalogo")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${abaAtiva === "catalogo" ? "bg-emerald-600/10 text-emerald-400 font-medium" : "hover:bg-slate-800 hover:text-white"}`}>
            <Package className="w-5 h-5" /> Meu Catálogo
          </button>
          <button onClick={() => setAbaAtiva("oportunidades")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${abaAtiva === "oportunidades" ? "bg-emerald-600/10 text-emerald-400 font-medium" : "hover:bg-slate-800 hover:text-white"}`}>
            <MessageCircle className="w-5 h-5" /> Oportunidades
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={() => navigate("/")} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" /> Voltar ao Site
          </button>
        </div>
      </aside>

      {/* ─── CONTEÚDO PRINCIPAL ─── */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        
        {/* ABA: PERFIL DA LOJA */}
        {abaAtiva === "perfil" && (
          <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Perfil Comercial</h1>
                <p className="text-slate-500 mt-1">Configure como a sua loja será vista pelos engenheiros no marketplace.</p>
              </div>
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-sm font-medium text-slate-600">Perfil: <span className={progressoPerfil === 100 ? "text-emerald-600" : "text-amber-500"}>{progressoPerfil}% completo</span></div>
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${progressoPerfil === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${progressoPerfil}%` }} />
                </div>
              </div>
            </div>

            {loadingPerfil ? (
               <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
            ) : (
              <div className="grid lg:grid-cols-[1fr_400px] gap-8">
                
                {/* LADO ESQUERDO: FORMULÁRIO */}
                <form onSubmit={handleSalvarPerfil} className="space-y-8">
                  
                  {/* Seção 1: Identidade */}
                  <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                      <Store className="w-5 h-5 text-emerald-600" />
                      <h2 className="text-xl font-bold text-slate-900">1. Identidade da Loja</h2>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <Label className="text-slate-700 font-bold">Nome de Exibição <span className="text-red-500">*</span></Label>
                        <Input required placeholder="Ex: Comercial Sorocaba" value={perfil.nome_loja} onChange={(e) => setPerfil({...perfil, nome_loja: e.target.value})} className="mt-1" />
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> Este nome será mostrado aos clientes.</p>
                      </div>

                      <div>
                        <Label className="text-slate-700 font-bold">Descrição da Loja <span className="text-red-500">*</span></Label>
                        <Textarea 
                          required 
                          rows={3} 
                          placeholder="Conte aos clientes o que sua loja vende, seus diferenciais e se fazem entrega rápida."
                          value={perfil.descricao} 
                          onChange={(e) => setPerfil({...perfil, descricao: e.target.value})} 
                          className="mt-1 resize-none" 
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-slate-700 font-bold">Categoria / Nicho <span className="text-red-500">*</span></Label>
                          <select
                            value={perfil.categoria}
                            onChange={(e) => setPerfil({ ...perfil, categoria: e.target.value })}
                            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                          >
                            <option value="">Selecione a categoria</option>
                            {[
                              "Materiais de Construção",
                              "Ferramentas",
                              "Materiais Elétricos",
                              "Materiais Hidráulicos",
                              "Equipamentos",
                              "Acabamentos",
                              "Tintas e Revestimentos",
                              "Madeiras",
                              "Aço e Ferragens",
                            ].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> Ajuda os clientes a encontrarem sua loja no diretório.</p>
                        </div>
                        <div>
                          <Label className="text-slate-700 font-bold">Logotipo (URL) (Opcional)</Label>
                          <Input placeholder="https://..." value={perfil.logo_url} onChange={(e) => setPerfil({ ...perfil, logo_url: e.target.value })} className="mt-1" />
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> Link da imagem do logo da sua loja.</p>
                        </div>
                      </div>
                    </div>
                  </div>


                  {/* Seção 2: Contato e Localização */}
                  <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      <h2 className="text-xl font-bold text-slate-900">2. Contato & Atendimento</h2>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-6 mb-6">
                      <div>
                        <Label className="text-slate-700 font-bold">WhatsApp Comercial <span className="text-red-500">*</span></Label>
                        <Input required placeholder="(15) 99999-9999" value={perfil.whatsapp} onChange={(e) => setPerfil({...perfil, whatsapp: maskPhone(e.target.value)})} className="mt-1" />
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> É para este número que os pedidos irão.</p>
                      </div>
                      <div>
                        <Label className="text-slate-700 font-bold">Instagram (Opcional)</Label>
                        <Input placeholder="@sua_loja" value={perfil.instagram} onChange={(e) => setPerfil({...perfil, instagram: e.target.value})} className="mt-1" />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-12 gap-6">
                      <div className="sm:col-span-8">
                        <Label className="text-slate-700 font-bold">Cidade <span className="text-red-500">*</span></Label>
                        <Input required placeholder="Ex: Sorocaba" value={perfil.cidade} onChange={(e) => setPerfil({...perfil, cidade: e.target.value})} className="mt-1" />
                      </div>
                      <div className="sm:col-span-4">
                        <Label className="text-slate-700 font-bold">Estado</Label>
                        <Input placeholder="SP" value={perfil.estado} onChange={(e) => setPerfil({...perfil, estado: e.target.value.toUpperCase().slice(0, 2)})} className="mt-1" />
                      </div>
                    </div>

                    <div className="mt-6">
                      <Label className="text-slate-700 font-bold">Horário de Atendimento (Opcional)</Label>
                      <Input placeholder="Ex: Seg a Sex das 08h às 18h" value={perfil.horario_atendimento} onChange={(e) => setPerfil({...perfil, horario_atendimento: e.target.value})} className="mt-1" />
                    </div>
                  </div>

                  {/* Seção 3: Dados Legais (Privado) */}
                  <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-slate-400" />
                        <h2 className="text-xl font-bold text-slate-900">3. Dados Fiscais</h2>
                      </div>
                      <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">Não exibido aos clientes</Badge>
                    </div>
                    
                    <div>
                      <Label className="text-slate-700 font-bold">CNPJ <span className="text-red-500">*</span></Label>
                      <Input required placeholder="00.000.000/0001-00" value={perfil.cnpj} onChange={(e) => setPerfil({...perfil, cnpj: maskCNPJ(e.target.value)})} className="mt-1 max-w-sm" />
                      <p className="text-xs text-slate-500 mt-1">Usado apenas para controle interno e segurança da plataforma.</p>
                    </div>
                  </div>

                  <div className="sticky bottom-6 bg-slate-900 p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-10 z-20">
                    <p className="text-slate-300 text-sm hidden sm:block">Você tem alterações prontas para salvar.</p>
                    <Button type="submit" disabled={salvandoPerfil} className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto px-8 shadow-lg">
                      {salvandoPerfil ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> Publicar Perfil</>}
                    </Button>
                  </div>
                </form>

                {/* LADO DIREITO: LIVE PREVIEW */}
                <div className="hidden lg:block relative">
                  <div className="sticky top-10">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Box className="w-4 h-4" /> Como o cliente vê
                    </h3>
                    
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden ring-4 ring-slate-50/50">
                      <div className="h-24 bg-gradient-to-r from-slate-200 to-slate-100 relative">
                        <div className="absolute -bottom-8 left-6 w-16 h-16 bg-white rounded-xl shadow-md border border-slate-100 flex items-center justify-center p-2">
                          <Store className="w-8 h-8 text-emerald-600 opacity-20" />
                        </div>
                      </div>
                      
                      <div className="p-6 pt-10">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-extrabold text-xl text-slate-900 leading-tight">
                              {perfil.nome_loja || "Nome da Loja"}
                            </h4>
                            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                              <MapPin className="w-3.5 h-3.5" /> 
                              {perfil.cidade ? `${perfil.cidade} - ${perfil.estado}` : "Cidade não informada"}
                            </div>
                          </div>
                          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">Verificada</Badge>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-4">
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">Sobre a loja</h5>
                            <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                              {perfil.descricao || "A descrição da sua loja aparecerá aqui para convencer o cliente."}
                            </p>
                          </div>
                          
                          {(perfil.horario_atendimento || perfil.instagram) && (
                            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                              {perfil.horario_atendimento && (
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" /> {perfil.horario_atendimento}
                                </div>
                              )}
                              {perfil.instagram && (
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <Instagram className="w-3.5 h-3.5 text-slate-400" /> {perfil.instagram}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <Button disabled className="w-full mt-6 bg-[#25D366] text-white font-medium opacity-80">
                          <MessageCircle className="w-4 h-4 mr-2" /> Falar no WhatsApp
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA: CATÁLOGO */}
        {abaAtiva === "catalogo" && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Gerenciar Catálogo</h1>
                <p className="text-slate-500 mt-1">Adicione ou edite os materiais que sua loja tem em estoque.</p>
              </div>
              <Button onClick={abrirModalNovo} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Novo Produto
              </Button>
            </div>

            {loadingProdutos ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
            ) : produtos.length === 0 ? (
              <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Sua vitrine está vazia</h3>
                <p className="text-slate-500 mb-6">Comece a adicionar produtos para que os engenheiros encontrem sua loja.</p>
                <Button onClick={abrirModalNovo} variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                  Adicionar Primeiro Produto
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Produto</th>
                        <th className="px-6 py-4">Categoria</th>
                        <th className="px-6 py-4">Preço (R$)</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {produtos.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{p.nome_produto}</td>
                          <td className="px-6 py-4">
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs">{p.categoria}</span>
                          </td>
                          <td className="px-6 py-4 font-medium text-emerald-700 tabular-nums">
                            R$ {p.preco.toFixed(2)} <span className="text-slate-400 font-normal text-xs">/ {p.unidade_medida}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => abrirModalEdicao(p)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Editar Produto">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => deletarProduto(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remover Produto">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 font-medium">
                  {produtos.length} de 50 produtos cadastrados no seu plano atual.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA: OPORTUNIDADES */}
        {abaAtiva === "oportunidades" && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-300">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Central de Oportunidades</h1>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Engenheiros buscando material</h3>
                <p className="text-slate-600 max-w-sm">
                  Em breve, você verá aqui quantas vezes seus produtos apareceram nas cotações e quantas pessoas clicaram para te chamar no WhatsApp.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ─── MODAL ADICIONAR/EDITAR PRODUTO ─── */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{formProduto.id ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            <DialogDescription>
              {formProduto.id 
                ? "Atualize as informações do seu material abaixo." 
                : "Adicione os detalhes do material para ele aparecer no marketplace."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvarProduto} className="space-y-4 mt-4">
            <div>
              <Label>Nome do Material</Label>
              <Input 
                required 
                placeholder="Ex: Cimento CP II 32 50kg Votoran" 
                value={formProduto.nome_produto}
                onChange={(e) => setFormProduto({...formProduto, nome_produto: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço (R$)</Label>
                <Input 
                  required 
                  type="number" 
                  step="0.01" 
                  min="0"
                  placeholder="34.90" 
                  value={formProduto.preco}
                  onChange={(e) => setFormProduto({...formProduto, preco: e.target.value})}
                />
              </div>
              <div>
                <Label>Unidade de Medida</Label>
                <select 
                  className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  value={formProduto.unidade_medida}
                  onChange={(e) => setFormProduto({...formProduto, unidade_medida: e.target.value})}
                >
                  <option value="un">Unidade (un)</option>
                  <option value="sc">Saco (sc)</option>
                  <option value="cx">Caixa (cx)</option>
                  <option value="m2">Metro Quadrado (m²)</option>
                  <option value="m3">Metro Cúbico (m³)</option>
                  <option value="kg">Quilo (kg)</option>
                  <option value="pct">Pacote (pct)</option>
                  <option value="barra 6m">Barra 6m</option>
                  <option value="rolo 100m">Rolo 100m</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Categoria</Label>
              <select 
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                value={formProduto.categoria}
                onChange={(e) => setFormProduto({...formProduto, categoria: e.target.value})}
              >
                <option value="Cimento e Argamassa">Cimento e Argamassa</option>
                <option value="Aço e Ferragens">Aço e Ferragens</option>
                <option value="Tijolos e Blocos">Tijolos e Blocos</option>
                <option value="Areia e Pedra">Areia e Pedra</option>
                <option value="Hidráulica">Hidráulica</option>
                <option value="Elétrica">Elétrica</option>
                <option value="Acabamentos">Acabamentos</option>
              </select>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4" disabled={salvandoProduto}>
              {salvandoProduto ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {salvandoProduto ? "Salvando..." : (formProduto.id ? "Atualizar Produto" : "Salvar Produto")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}