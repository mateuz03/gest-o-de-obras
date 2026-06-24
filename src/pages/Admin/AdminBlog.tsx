import { useEffect, useMemo, useState } from "react";
import { Edit, Eye, Loader2, Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { BLOG_CATEGORIES, BLOG_FORMATS } from "@/lib/admin";
import { toast } from "sonner";

interface Artigo {
  id: number;
  slug: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  categoria: string;
  tipo: string;
  autor: string;
  tempo_leitura: string;
  imagem: string | null;
  destaque: boolean | null;
  created_at: string;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=900&auto=format&fit=crop";

function gerarSlug(titulo: string) {
  return titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function AdminBlog() {
  const [rows, setRows] = useState<Artigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Artigo | null>(null);

  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [resumo, setResumo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [categoria, setCategoria] = useState<string>(BLOG_CATEGORIES[0]);
  const [tipo, setTipo] = useState<string>(BLOG_FORMATS[0]);
  const [autor, setAutor] = useState("");
  const [tempoLeitura, setTempoLeitura] = useState("5 min");
  const [imagem, setImagem] = useState("");
  const [destaque, setDestaque] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, titulo, resumo, conteudo, categoria, tipo, autor, tempo_leitura, imagem, destaque, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data as Artigo[]) ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar os posts do blog.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const term = search.toLowerCase();
      const matchSearch =
        !term ||
        row.titulo.toLowerCase().includes(term) ||
        row.autor.toLowerCase().includes(term) ||
        row.slug.toLowerCase().includes(term);

      const matchCategory = category === "todas" || row.categoria === category;
      return matchSearch && matchCategory;
    });
  }, [rows, search, category]);

  function resetForm() {
    setEditing(null);
    setTitulo("");
    setSlug("");
    setResumo("");
    setConteudo("");
    setCategoria(BLOG_CATEGORIES[0]);
    setTipo(BLOG_FORMATS[0]);
    setAutor("");
    setTempoLeitura("5 min");
    setImagem("");
    setDestaque(false);
  }

  function abrirNovo() {
    resetForm();
    setDialogOpen(true);
  }

  function abrirEdicao(row: Artigo) {
    setEditing(row);
    setTitulo(row.titulo);
    setSlug(row.slug);
    setResumo(row.resumo);
    setConteudo(row.conteudo);
    setCategoria(row.categoria);
    setTipo(row.tipo);
    setAutor(row.autor);
    setTempoLeitura(row.tempo_leitura);
    setImagem(row.imagem || "");
    setDestaque(Boolean(row.destaque));
    setDialogOpen(true);
  }

  async function salvar() {
    if (!titulo.trim() || !slug.trim() || !resumo.trim() || !conteudo.trim() || !autor.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("admin_upsert_blog_post", {
        _id: editing?.id ?? null,
        _slug: slug.trim(),
        _titulo: titulo.trim(),
        _resumo: resumo.trim(),
        _conteudo: conteudo.trim(),
        _categoria: categoria,
        _tipo: tipo,
        _autor: autor.trim(),
        _tempo_leitura: tempoLeitura.trim() || "5 min",
        _imagem: imagem.trim() || null,
        _destaque: destaque,
      });
      if (error) throw error;

      const saved = data as Artigo;
      if (editing) {
        setRows((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
        toast.success("Post atualizado com sucesso.");
      } else {
        setRows((prev) => [saved, ...prev]);
        toast.success("Post criado com sucesso.");
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível salvar o post.");
    } finally {
      setSaving(false);
    }
  }

  async function remover(id: number) {
    setDeletingId(id);
    try {
      const { data, error } = await supabase.rpc("admin_delete_blog_post", { _id: id });
      if (error) throw error;
      if (!data) throw new Error("DELETE_FAILED");

      setRows((prev) => prev.filter((item) => item.id !== id));
      toast.success("Post removido com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível remover o post.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Conteúdo</p>
          <h2 className="mt-1 text-3xl font-extrabold text-slate-900">Gestão do blog</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Cadastre, revise e publique posts reais consumidos pela área pública do Obra Link.
          </p>
        </div>
        <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={abrirNovo}>
          <Plus className="mr-2 h-4 w-4" />
          Novo post
        </Button>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título, autor ou slug..."
              className="pl-9"
            />
          </div>

          <select
            className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="todas">Todas as categorias</option>
            {BLOG_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
            <p className="mt-3 text-sm text-slate-500">Carregando posts...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-500">
            Nenhum post encontrado para os filtros atuais.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <div key={row.id} className="flex flex-col gap-4 p-5 lg:flex-row">
                <div className="h-32 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 lg:w-56">
                  <img
                    src={row.imagem || FALLBACK_IMAGE}
                    alt={row.titulo}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      (event.target as HTMLImageElement).src = FALLBACK_IMAGE;
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{row.titulo}</h3>
                    {row.destaque ? (
                      <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
                        Destaque
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{row.resumo}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                      {row.categoria}
                    </Badge>
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                      {row.tipo}
                    </Badge>
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                      {row.tempo_leitura}
                    </Badge>
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                      {formatDate(row.created_at)}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-400">Por {row.autor}</p>
                </div>

                <div className="flex shrink-0 gap-2 lg:flex-col">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-200 bg-white"
                    onClick={() => window.open(`/blog/${row.slug}`, "_blank", "noopener,noreferrer")}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="border-slate-200 bg-white" onClick={() => abrirEdicao(row)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    onClick={() => void remover(row.id)}
                    disabled={deletingId === row.id}
                  >
                    {deletingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setDialogOpen(false);
            resetForm();
          } else {
            setDialogOpen(open);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar post" : "Novo post"}</DialogTitle>
            <DialogDescription>
              O conteúdo salvo aqui alimenta diretamente a vitrine pública do blog.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="blog-title">Título *</Label>
              <Input id="blog-title" value={titulo} onChange={(event) => setTitulo(event.target.value)} />
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="blog-slug">Slug *</Label>
                <Input id="blog-slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
              </div>
              <Button variant="outline" className="mt-7 border-slate-200 bg-white" onClick={() => setSlug(gerarSlug(titulo))}>
                Gerar slug
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="blog-category">Categoria *</Label>
                <select
                  id="blog-category"
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={categoria}
                  onChange={(event) => setCategoria(event.target.value)}
                >
                  {BLOG_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blog-type">Formato *</Label>
                <select
                  id="blog-type"
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={tipo}
                  onChange={(event) => setTipo(event.target.value)}
                >
                  {BLOG_FORMATS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="blog-author">Autor *</Label>
                <Input id="blog-author" value={autor} onChange={(event) => setAutor(event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blog-reading-time">Tempo de leitura</Label>
                <Input id="blog-reading-time" value={tempoLeitura} onChange={(event) => setTempoLeitura(event.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blog-image">Imagem de capa</Label>
              <Input id="blog-image" value={imagem} onChange={(event) => setImagem(event.target.value)} placeholder="https://..." />
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <img
                  src={imagem || FALLBACK_IMAGE}
                  alt="Prévia do post"
                  className="h-48 w-full object-cover"
                  onError={(event) => {
                    (event.target as HTMLImageElement).src = FALLBACK_IMAGE;
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                id="blog-featured"
                type="checkbox"
                checked={destaque}
                onChange={(event) => setDestaque(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="blog-featured" className="cursor-pointer">
                Exibir este post como destaque do blog
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blog-summary">Resumo *</Label>
              <Textarea
                id="blog-summary"
                rows={4}
                maxLength={220}
                value={resumo}
                onChange={(event) => setResumo(event.target.value)}
                placeholder="Resumo curto para cards e listagem."
              />
              <p className="text-xs text-slate-400">{resumo.length}/220</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blog-content">Conteúdo completo *</Label>
              <Textarea
                id="blog-content"
                rows={14}
                value={conteudo}
                onChange={(event) => setConteudo(event.target.value)}
                placeholder="Você pode colar HTML simples ou texto formatado."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-slate-200"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void salvar()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {editing ? "Salvar alterações" : "Publicar post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
