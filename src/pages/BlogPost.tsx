import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Heart, Loader2, Share2, User } from "lucide-react";

import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  FALLBACK_BLOG_IMAGE,
  getMockBlogPosts,
  mapBlogRowToPublicPost,
  sanitizeBlogHtml,
  type PublicBlogPost,
} from "@/lib/blog";
import { toast } from "sonner";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [artigo, setArtigo] = useState<PublicBlogPost | null>(null);
  const [relacionados, setRelacionados] = useState<PublicBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorito, setIsFavorito] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function carregarArtigo() {
      if (!slug) {
        navigate("/blog", { replace: true });
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("blog_posts")
          .select("id, slug, titulo, resumo, conteudo, categoria, tipo, autor, created_at, tempo_leitura, imagem, destaque")
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;

        let post = data ? mapBlogRowToPublicPost(data) : null;

        if (!post) {
          const fallback = getMockBlogPosts();
          post = fallback.find((item) => item.slug === slug) ?? null;
          if (post) {
            setRelacionados(
              fallback
                .filter((item) => item.categoria === post?.categoria && item.id !== post.id)
                .slice(0, 2),
            );
          }
        } else {
          const { data: relatedRows } = await supabase
            .from("blog_posts")
            .select("id, slug, titulo, resumo, conteudo, categoria, tipo, autor, created_at, tempo_leitura, imagem, destaque")
            .eq("categoria", post.categoria)
            .neq("slug", post.slug)
            .order("created_at", { ascending: false })
            .limit(2);

          if (!cancelled) {
            setRelacionados((relatedRows ?? []).map(mapBlogRowToPublicPost));
          }
        }

        if (!post) {
          toast.error("Artigo não encontrado.");
          navigate("/blog", { replace: true });
          return;
        }

        if (!cancelled) {
          setArtigo(post);
        }

        if (user) {
          const { data: favorite } = await supabase
            .from("blog_favorites")
            .select("id")
            .eq("user_id", user.id)
            .eq("post_id", post.id)
            .maybeSingle();

          if (!cancelled) {
            setIsFavorito(Boolean(favorite));
          }
        } else if (!cancelled) {
          setIsFavorito(false);
        }
      } catch (error) {
        console.error("Erro ao carregar artigo:", error);
        const fallback = getMockBlogPosts();
        const post = fallback.find((item) => item.slug === slug) ?? null;

        if (!post) {
          toast.error("Artigo não encontrado.");
          navigate("/blog", { replace: true });
          return;
        }

        if (!cancelled) {
          setArtigo(post);
          setRelacionados(
            fallback.filter((item) => item.categoria === post.categoria && item.id !== post.id).slice(0, 2),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void carregarArtigo();

    return () => {
      cancelled = true;
    };
  }, [navigate, slug, user]);

  const htmlSeguro = useMemo(() => sanitizeBlogHtml(artigo?.conteudo ?? ""), [artigo?.conteudo]);

  async function handleToggleFavorito() {
    if (!user) {
      toast.error("Você precisa estar logado para favoritar artigos.");
      return;
    }

    if (!artigo) return;

    setSalvando(true);
    try {
      if (isFavorito) {
        const { error } = await supabase
          .from("blog_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", artigo.id);

        if (error) throw error;
        setIsFavorito(false);
        toast.success("Removido dos favoritos.");
      } else {
        const { error } = await supabase
          .from("blog_favorites")
          .insert([{ user_id: user.id, post_id: artigo.id }]);

        if (error) throw error;
        setIsFavorito(true);
        toast.success("Artigo favoritado.");
      }
    } catch (error) {
      console.error("Erro ao gerenciar favorito:", error);
      toast.error("Falha ao processar solicitação.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleCompartilhar() {
    if (!artigo) return;

    const url = `${window.location.origin}/blog/${artigo.slug}`;
    const texto = `Confira este artigo no Blog Obra Link: "${artigo.titulo}"`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: artigo.titulo,
          text: artigo.resumo,
          url,
        });
        return;
      } catch (error) {
        console.error("Erro ao compartilhar:", error);
      }
    }

    try {
      await navigator.clipboard.writeText(`${texto}\n${url}`);
      toast.success("Link copiado para a área de transferência.");
    } catch (error) {
      console.error("Erro ao copiar link:", error);
      toast.error("Não foi possível compartilhar o artigo.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-slate-500">Carregando artigo...</p>
        </div>
      </div>
    );
  }

  if (!artigo) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="relative h-96 w-full overflow-hidden bg-slate-900">
        <img
          src={artigo.imagem}
          alt={artigo.titulo}
          className="h-full w-full object-cover"
          onError={(event) => {
            (event.target as HTMLImageElement).src = FALLBACK_BLOG_IMAGE;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />

        <div className="absolute left-4 top-4 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/blog")}
            className="rounded-full bg-white/90 text-slate-900 hover:bg-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Blog
          </Button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 p-8 text-white">
          <div className="mb-4 flex gap-2">
            <Badge className="bg-emerald-600 font-semibold text-white">{artigo.categoria}</Badge>
            <Badge className="bg-slate-700 font-semibold text-white">{artigo.tipo}</Badge>
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight">{artigo.titulo}</h1>
        </div>
      </div>

      <main className="container mx-auto max-w-3xl px-4 py-12">
        <div className="mb-10 flex flex-wrap items-center gap-6 border-b border-slate-200 pb-8">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User className="h-4 w-4" />
            <span className="font-medium">{artigo.autor}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4" />
            <span>{artigo.data}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
            <Clock className="h-4 w-4" />
            <span>{artigo.tempoLeitura} de leitura</span>
          </div>

          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleToggleFavorito()}
              disabled={salvando}
              className={isFavorito ? "border-amber-300 bg-amber-50 text-amber-600" : ""}
            >
              <Heart className={`mr-1 h-4 w-4 ${isFavorito ? "fill-current" : ""}`} />
              {isFavorito ? "Favoritado" : "Favoritar"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void handleCompartilhar()}>
              <Share2 className="mr-1 h-4 w-4" />
              Compartilhar
            </Button>
          </div>
        </div>

        <article className="prose prose-slate mb-16 max-w-none">
          <div
            className="space-y-6 leading-relaxed text-slate-700"
            dangerouslySetInnerHTML={{
              __html: htmlSeguro
                .replace(/<h2>/g, '<h2 class="mt-8 mb-4 text-2xl font-bold text-slate-900">')
                .replace(/<h3>/g, '<h3 class="mt-6 mb-3 text-xl font-bold text-slate-800">')
                .replace(/<p>/g, '<p class="leading-relaxed text-slate-700">')
                .replace(/<ul>/g, '<ul class="list-inside list-disc space-y-2 text-slate-700">')
                .replace(/<ol>/g, '<ol class="list-inside list-decimal space-y-2 text-slate-700">')
                .replace(/<li>/g, '<li class="text-slate-700">')
                .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-emerald-200 pl-4 italic text-slate-600">')
                .replace(/<a /g, '<a class="font-medium text-emerald-700 underline underline-offset-2" '),
            }}
          />
        </article>

        <div className="flex flex-col gap-4 border-t border-slate-200 pt-8 sm:flex-row">
          <Button onClick={() => navigate("/blog")} className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Blog
          </Button>
          <Button asChild variant="outline" className="rounded-lg">
            <Link to="/dashboard">Ir para o Dashboard</Link>
          </Button>
        </div>

        {relacionados.length > 0 ? (
          <div className="mt-16 border-t border-slate-200 pt-12">
            <h3 className="mb-6 text-2xl font-bold text-slate-900">Artigos Relacionados</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {relacionados.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-emerald-300 hover:shadow-md"
                >
                  <h4 className="mb-2 line-clamp-2 font-semibold text-slate-900 transition-colors group-hover:text-emerald-600">
                    {post.titulo}
                  </h4>
                  <p className="mb-3 line-clamp-2 text-sm text-slate-500">{post.resumo}</p>
                  <span className="text-xs font-medium text-emerald-600">Ler mais →</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
