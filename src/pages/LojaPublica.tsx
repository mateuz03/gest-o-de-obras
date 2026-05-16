import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  Box, 
  ArrowLeft, 
  Store, 
  MapPin, 
  Clock, 
  Instagram, 
  MessageCircle, 
  Loader2, 
  Package,
  CheckCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fallbackImage = "https://images.unsplash.com/photo-1541888081622-132d718b52f6?q=80&w=400&auto=format&fit=crop";

export default function LojaPublica() {
  const { id } = useParams<{ id: string }>(); 
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loja, setLoja] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLoja() {
      if (!id) return;
      try {
        const { data: perfilData, error: perfilError } = await supabase
          .from("perfil_lojista")
          .select("*")
          .eq("user_id", id)
          .maybeSingle();

        if (perfilError) throw perfilError;
        if (perfilData) {
          setLoja(perfilData);
        }

        const { data: produtosData, error: produtosError } = await supabase
          .from("produtos_loja")
          .select("*")
          .eq("user_id", id)
          .eq("status", "ativo")
          .order("created_at", { ascending: false });

        if (produtosError) throw produtosError;
        if (produtosData) setProdutos(produtosData);

      } catch (error) {
        console.error("Erro ao carregar loja:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLoja();
  }, [id]);

  const chamarNoWhatsApp = (produtoNome?: string) => {
    if (!loja?.whatsapp) {
      toast.error("Esta loja não possui um WhatsApp cadastrado.");
      return;
    }

    const numeroZap = loja.whatsapp.replace(/\D/g, "");
    let mensagem = `Olá, encontrei a ${loja.nome_loja} no Obra Link!`;
    
    if (produtoNome) {
      mensagem = `Olá, vi o produto *${produtoNome}* no catálogo da ${loja.nome_loja} no Obra Link e gostaria de fazer uma cotação.`;
    }

    const url = `https://wa.me/55${numeroZap}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  // ESTADO 1: CARREGANDO
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-500 font-medium">Carregando vitrine...</p>
      </div>
    );
  }

  // ESTADO 2: LOJA NÃO ENCONTRADA (Isso substitui a tela branca!)
  if (!loja) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Store className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Loja não encontrada</h2>
        <p className="text-slate-500 mb-6 text-center max-w-md">O link pode estar quebrado ou o lojista ainda não terminou de preencher o perfil comercial.</p>
        <Button onClick={() => navigate("/marketplace")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Marketplace
        </Button>
      </div>
    );
  }

  // ESTADO 3: LOJA ENCONTRADA (A tela completa)
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* ─── HEADER ─── */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <Box className="h-6 w-6 text-emerald-600" />
            <span>Obra Link</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            onClick={() => navigate("/marketplace")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Marketplace
          </Button>
        </div>
      </nav>

      {/* ─── HERO DA LOJA (BANNER) ─── */}
      <div className="bg-slate-900 w-full h-48 md:h-64 relative">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
      </div>

      <main className="container max-w-6xl mx-auto px-4 lg:px-8 -mt-16 md:-mt-24 relative z-10">
        
        <div className="grid lg:grid-cols-[340px_1fr] gap-8">
          
          {/* ─── SIDEBAR: INFORMAÇÕES DA LOJA ─── */}
          <aside className="space-y-6">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6">
              
              <div className="w-24 h-24 bg-white rounded-2xl shadow-md border border-slate-100 flex items-center justify-center p-2 mb-6 -mt-16 relative z-20">
                <Store className="w-12 h-12 text-emerald-600 opacity-20" />
              </div>

              <div className="flex items-start justify-between mb-2">
                <h1 className="font-extrabold text-2xl text-slate-900 leading-tight">
                  {loja.nome_loja || "Nome da Loja"}
                </h1>
              </div>
              
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 mb-6">
                <MapPin className="w-4 h-4 text-emerald-600" /> 
                {loja.cidade ? `${loja.cidade} - ${loja.estado || 'SP'}` : "Localização não informada"}
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                  <CheckCircle className="w-3 h-3 mr-1" /> Parceiro Verificado
                </Badge>
              </div>

              <Button 
                onClick={() => chamarNoWhatsApp()} 
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-medium py-6 rounded-xl shadow-sm text-base"
              >
                <MessageCircle className="w-5 h-5 mr-2" /> Falar com Vendedor
              </Button>

              <Separator className="my-6" />

              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Sobre a empresa</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {loja.descricao || "Esta loja ainda não adicionou uma descrição ao perfil."}
                  </p>
                </div>

                {(loja.horario_atendimento || loja.instagram) && (
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                    {loja.horario_atendimento && (
                      <div className="flex items-start gap-3 text-sm text-slate-700">
                        <Clock className="w-4 h-4 text-slate-400 mt-0.5" /> 
                        <span><span className="font-semibold block mb-0.5">Horários</span>{loja.horario_atendimento}</span>
                      </div>
                    )}
                    {loja.instagram && (
                      <div className="flex items-start gap-3 text-sm text-slate-700">
                        <Instagram className="w-4 h-4 text-slate-400 mt-0.5" /> 
                        <span><span className="font-semibold block mb-0.5">Instagram</span>{loja.instagram}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* ─── ÁREA PRINCIPAL: CATÁLOGO DE PRODUTOS ─── */}
          <section className="pt-4 md:pt-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Catálogo de Materiais</h2>
              <Badge variant="outline" className="text-slate-500 bg-white">
                {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}
              </Badge>
            </div>

            {produtos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Vitrine Vazia</h3>
                <p className="text-slate-500">Esta loja ainda não cadastrou nenhum produto no marketplace.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {produtos.map((p) => (
                  <Card key={p.id} className="overflow-hidden border-slate-200 hover:shadow-lg transition-all hover:-translate-y-1 bg-white group">
                    <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative border-b border-slate-100">
                      <img
                        src={p.foto_url || fallbackImage}
                        alt={p.nome_produto}
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <CardContent className="p-5 flex flex-col h-full">
                      <Badge variant="outline" className="w-fit text-xs border-slate-200 text-slate-600 bg-slate-50 mb-3">
                        {p.categoria}
                      </Badge>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 mb-4 flex-1">
                        {p.nome_produto}
                      </h3>
                      
                      <div className="flex items-end justify-between mt-auto pt-4 border-t border-slate-50">
                        <div>
                          <span className="text-lg font-black text-emerald-700 tabular-nums leading-none block">
                            {formatCurrency(p.preco)}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                            POR {p.unidade_medida}
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => chamarNoWhatsApp(p.nome_produto)}
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                        >
                          Cotar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}