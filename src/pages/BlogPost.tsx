import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, User, Share2, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { BLOG_POSTS, BlogPostData } from "@/data/blogData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' viewBox='0 0 800 400'%3E%3Crect width='800' height='400' fill='%23f1f5f9'/%3E%3Crect x='340' y='160' width='120' height='80' rx='8' fill='%23cbd5e1'/%3E%3Ccircle cx='400' cy='145' r='20' fill='%23cbd5e1'/%3E%3C/svg%3E";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [artigo, setArtigo] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorito, setIsFavorito] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Carregar artigo
  useEffect(() => {
    if (!slug) {
      navigate("/blog");
      return;
    }

    const post = BLOG_POSTS.find((p) => p.slug === slug);
    if (!post) {
      toast.error("Artigo não encontrado");
      navigate("/blog");
      return;
    }

    setArtigo(post);

    // Verificar se está favoritado
    if (user) {
      (async () => {
        try {
          const { data } = await supabase
            .from("blog_favorites")
            .select("id")
            .eq("user_id", user.id)
            .eq("post_id", post.id)
            .single();

          if (data) setIsFavorito(true);
        } catch (err) {
          console.error("Erro ao verificar favorito:", err);
        }
      })();
    }

    setLoading(false);
  }, [slug, user, navigate]);

  const handleToggleFavorito = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para favoritar artigos.");
      return;
    }

    if (!artigo) return;

    setSalvando(true);
    try {
      if (isFavorito) {
        await supabase
          .from("blog_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", artigo.id);

        setIsFavorito(false);
        toast.success("Removido dos favoritos.");
      } else {
        await supabase
          .from("blog_favorites")
          .insert([{ user_id: user.id, post_id: artigo.id }]);

        setIsFavorito(true);
        toast.success("Artigo favoritado!");
      }
    } catch (err) {
      console.error("Erro ao gerenciar favorito:", err);
      toast.error("Falha ao processar solicitação.");
    } finally {
      setSalvando(false);
    }
  };

  const handleCompartilhar = async () => {
    if (!artigo) return;

    const url = `${window.location.origin}/blog/${artigo.slug}`;
    const texto = `Confira este artigo no Blog Obra Link: "${artigo.titulo}"`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: artigo.titulo,
          text: artigo.resumo,
          url: url,
        });
      } catch (err) {
        console.error("Erro ao compartilhar:", err);
      }
    } else {
      // Fallback: copiar para clipboard
      await navigator.clipboard.writeText(`${texto}\n${url}`);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-slate-500">Carregando artigo...</p>
        </div>
      </div>
    );
  }

  if (!artigo) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Header com imagem */}
      <div className="relative w-full h-96 bg-slate-900 overflow-hidden">
        <img
          src={artigo.imagem}
          alt={artigo.titulo}
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />

        {/* Botão voltar */}
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/blog")}
            className="bg-white/90 hover:bg-white text-slate-900 rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Blog
          </Button>
        </div>

        {/* Badges e título sobreposto */}
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white z-10">
          <div className="flex gap-2 mb-4">
            <Badge className="bg-emerald-600 text-white font-semibold">
              {artigo.categoria}
            </Badge>
            <Badge className="bg-slate-700 text-white font-semibold">
              {artigo.tipo}
            </Badge>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight max-w-3xl">
            {artigo.titulo}
          </h1>
        </div>
      </div>

      {/* Conteúdo principal */}
      <main className="container max-w-3xl mx-auto py-12 px-4">
        {/* Meta informações */}
        <div className="flex flex-wrap items-center gap-6 mb-10 pb-8 border-b border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User className="w-4 h-4" />
            <span className="font-medium">{artigo.autor}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>{artigo.data}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
            <Clock className="w-4 h-4" />
            <span>{artigo.tempoLeitura} de leitura</span>
          </div>

          {/* Botões de ação */}
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleFavorito}
              disabled={salvando}
              className={isFavorito ? "border-amber-300 text-amber-600 bg-amber-50" : ""}
            >
              <Heart className={`w-4 h-4 mr-1 ${isFavorito ? "fill-current" : ""}`} />
              {isFavorito ? "Favoritado" : "Favoritar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCompartilhar}
            >
              <Share2 className="w-4 h-4 mr-1" />
              Compartilhar
            </Button>
          </div>
        </div>

        {/* Conteúdo do artigo */}
        <article className="prose prose-slate max-w-none mb-16">
          <div
            className="text-slate-700 leading-relaxed space-y-6"
            dangerouslySetInnerHTML={{
              __html: artigo.conteudo
                .replace(/<h2>/g, '<h2 class="text-2xl font-bold text-slate-900 mt-8 mb-4">')
                .replace(/<h3>/g, '<h3 class="text-xl font-bold text-slate-800 mt-6 mb-3">')
                .replace(/<p>/g, '<p class="text-slate-700 leading-relaxed">')
                .replace(/<ul>/g, '<ul class="list-disc list-inside space-y-2 text-slate-700">')
                .replace(/<ol>/g, '<ol class="list-decimal list-inside space-y-2 text-slate-700">')
                .replace(/<li>/g, '<li class="text-slate-700">')
            }}
          />
        </article>

        {/* CTA para voltar */}
        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-200">
          <Button
            onClick={() => navigate("/blog")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Blog
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-lg"
          >
            <Link to="/dashboard">Ir para o Dashboard</Link>
          </Button>
        </div>

        {/* Artigos relacionados */}
        <div className="mt-16 pt-12 border-t border-slate-200">
          <h3 className="text-2xl font-bold text-slate-900 mb-6">Artigos Relacionados</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BLOG_POSTS.filter((p) => p.categoria === artigo.categoria && p.id !== artigo.id)
              .slice(0, 2)
              .map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all bg-white"
                >
                  <h4 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors mb-2 line-clamp-2">
                    {post.titulo}
                  </h4>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                    {post.resumo}
                  </p>
                  <span className="text-xs text-emerald-600 font-medium">Ler mais →</span>
                </Link>
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}