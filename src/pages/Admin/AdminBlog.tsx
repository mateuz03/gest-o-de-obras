import { useState } from "react";
import { Plus, Edit, Trash2, Eye, Search, Filter, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const CATEGORIAS = ["Gestão de Obras", "Produtividade", "Suprimentos", "Tecnologia BIM"] as const;
const FORMATOS = ["Artigo Técnico", "Guia Prático", "Tendência", "Estudo de Caso"] as const;

type Artigo = {
  id: string;
  titulo: string;
  slug: string;
  categoria: typeof CATEGORIAS[number];
  formato: typeof FORMATOS[number];
  tempo_leitura: string;
  autor: string;
  imagem_capa: string;
  destaque: boolean;
  resumo: string;
  conteudo: string;
  data_criacao: string;
};

// Dados mockados iniciais
const ARTIGOS_INICIAIS: Artigo[] = [
  {
    id: "1",
    titulo: "Como otimizar o cronograma da sua obra",
    slug: "como-otimizar-cronograma-obra",
    categoria: "Gestão de Obras",
    formato: "Guia Prático",
    tempo_leitura: "8 min",
    autor: "Engenheiro Silva",
    imagem_capa: "https://via.placeholder.com/400x200?text=Cronograma",
    destaque: true,
    resumo: "Dicas práticas para otimizar o cronograma e evitar atrasos.",
    conteudo: "Conteúdo completo do artigo aqui...",
    data_criacao: "15/05/2026",
  },
  {
    id: "2",
    titulo: "Tendências em BIM para 2026",
    slug: "tendencias-bim-2026",
    categoria: "Tecnologia BIM",
    formato: "Tendência",
    tempo_leitura: "6 min",
    autor: "Arquiteto Costa",
    imagem_capa: "https://via.placeholder.com/400x200?text=BIM",
    destaque: true,
    resumo: "As principais tendências de BIM que vão dominar o mercado.",
    conteudo: "Conteúdo completo do artigo aqui...",
    data_criacao: "12/05/2026",
  },
  {
    id: "3",
    titulo: "Gestão de suprimentos em grandes obras",
    slug: "gestao-suprimentos-grandes-obras",
    categoria: "Suprimentos",
    formato: "Artigo Técnico",
    tempo_leitura: "10 min",
    autor: "Gerenciador Oliveira",
    imagem_capa: "https://via.placeholder.com/400x200?text=Suprimentos",
    destaque: false,
    resumo: "Sistema eficiente para controlar suprimentos em projetos grandes.",
    conteudo: "Conteúdo completo do artigo aqui...",
    data_criacao: "10/05/2026",
  },
];

function gerarSlug(titulo: string): string {
  return titulo
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type FormArticuloProps = {
  artigo?: Artigo;
  onSave: (artigo: Artigo) => void;
  onClose: () => void;
};

function FormArticulo({ artigo, onSave, onClose }: FormArticuloProps) {
  const [titulo, setTitulo] = useState(artigo?.titulo ?? "");
  const [slug, setSlug] = useState(artigo?.slug ?? "");
  const [categoria, setCategoria] = useState(artigo?.categoria ?? "");
  const [formato, setFormato] = useState(artigo?.formato ?? "");
  const [tempoLeitura, setTempoLeitura] = useState(artigo?.tempo_leitura ?? "");
  const [autor, setAutor] = useState(artigo?.autor ?? "");
  const [imagemCapa, setImagemCapa] = useState(artigo?.imagem_capa ?? "");
  const [destaque, setDestaque] = useState(artigo?.destaque ?? false);
  const [resumo, setResumo] = useState(artigo?.resumo ?? "");
  const [conteudo, setConteudo] = useState(artigo?.conteudo ?? "");
  const [salvando, setSalvando] = useState(false);

  const handleAutoGerarSlug = () => {
    setSlug(gerarSlug(titulo));
  };

  const handleSave = async () => {
    if (!titulo.trim() || !slug.trim() || !categoria || !formato || !autor.trim() || !resumo.trim() || !conteudo.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSalvando(true);
    try {
      // Simulando delay de requisição
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const novoArtigo: Artigo = {
        id: artigo?.id ?? Date.now().toString(),
        titulo,
        slug,
        categoria: categoria as typeof CATEGORIAS[number],
        formato: formato as typeof FORMATOS[number],
        tempo_leitura: tempoLeitura,
        autor,
        imagem_capa: imagemCapa,
        destaque,
        resumo,
        conteudo,
        data_criacao: artigo?.data_criacao ?? new Date().toLocaleDateString("pt-BR"),
      };

      onSave(novoArtigo);
      toast.success(artigo ? "Artigo atualizado com sucesso!" : "Artigo criado com sucesso!");
      onClose();
    } catch (err) {
      toast.error("Erro ao salvar artigo");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-slate-700 font-medium">Título *</Label>
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: Como otimizar o cronograma da sua obra"
          className="bg-white border-slate-300"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <Label className="text-slate-700 font-medium">Slug *</Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="como-otimizar-cronograma"
            className="bg-white border-slate-300"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleAutoGerarSlug}
          className="mt-7"
        >
          Gerar Slug
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-700 font-medium">Categoria *</Label>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="bg-white border-slate-300">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-700 font-medium">Formato *</Label>
          <Select value={formato} onValueChange={setFormato}>
            <SelectTrigger className="bg-white border-slate-300">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {FORMATOS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-700 font-medium">Tempo de Leitura</Label>
          <Input
            value={tempoLeitura}
            onChange={(e) => setTempoLeitura(e.target.value)}
            placeholder="Ex: 8 min"
            className="bg-white border-slate-300"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-700 font-medium">Autor *</Label>
          <Input
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
            placeholder="Ex: Engenheiro Silva"
            className="bg-white border-slate-300"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-700 font-medium">URL da Imagem de Capa</Label>
        <Input
          value={imagemCapa}
          onChange={(e) => setImagemCapa(e.target.value)}
          placeholder="https://exemplo.com/imagem.jpg"
          className="bg-white border-slate-300"
        />
        {imagemCapa && (
          <img src={imagemCapa} alt="Preview" className="h-32 w-full object-cover rounded-lg" />
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="destaque"
          checked={destaque}
          onChange={(e) => setDestaque(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 cursor-pointer"
        />
        <Label htmlFor="destaque" className="text-slate-700 font-medium cursor-pointer">
          Artigo em Destaque
        </Label>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-700 font-medium">Resumo *</Label>
        <Textarea
          value={resumo}
          onChange={(e) => setResumo(e.target.value.slice(0, 200))}
          placeholder="Breve resumo do artigo para exibir no card..."
          rows={3}
          maxLength={200}
          className="bg-white border-slate-300 resize-none"
        />
        <p className="text-xs text-slate-500">{resumo.length}/200</p>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-700 font-medium">Conteúdo Completo *</Label>
        <Textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          placeholder="Cole ou escreva o conteúdo completo do artigo..."
          rows={10}
          className="bg-white border-slate-300 resize-none"
        />
      </div>

      <div className="flex gap-3 border-t border-slate-100 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={salvando}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={salvando}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {salvando ? "Salvando..." : "Salvar Artigo"}
        </Button>
      </div>
    </div>
  );
}

export default function AdminBlog() {
  const [artigos, setArtigos] = useState<Artigo[]>(ARTIGOS_INICIAIS);
  const [buscaUser, setBuscaUser] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [articuloEditando, setArticuloEditando] = useState<Artigo | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [deletando, setDeletando] = useState<string | null>(null);

  const articulosFiltrados = artigos.filter((a) => {
    const matchBusca =
      a.titulo.toLowerCase().includes(buscaUser.toLowerCase()) ||
      a.autor.toLowerCase().includes(buscaUser.toLowerCase());
    const matchCategoria = filtroCategoria === "Todas" || a.categoria === filtroCategoria;
    return matchBusca && matchCategoria;
  });

  const handleSave = (novoArtigo: Artigo) => {
    if (articuloEditando) {
      setArtigos(artigos.map((a) => (a.id === novoArtigo.id ? novoArtigo : a)));
    } else {
      setArtigos([novoArtigo, ...artigos]);
    }
    setArticuloEditando(null);
  };

  const handleDelete = async (id: string) => {
    setDeletando(id);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setArtigos(artigos.filter((a) => a.id !== id));
      toast.success("Artigo deletado com sucesso!");
    } catch (err) {
      toast.error("Erro ao deletar artigo");
    } finally {
      setDeletando(null);
    }
  };

  const handleEditar = (artigo: Artigo) => {
    setArticuloEditando(artigo);
    setDialogAberto(true);
  };

  const handleNovoArtigo = () => {
    setArticuloEditando(null);
    setDialogAberto(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Gestão do Blog</h2>
          <p className="text-sm text-slate-500 mt-1">
            Crie, edite e gerencie os artigos da plataforma.
          </p>
        </div>
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger asChild>
            <Button
              onClick={handleNovoArtigo}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Novo Artigo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {articuloEditando ? "Editar Artigo" : "Novo Artigo"}
              </DialogTitle>
              <DialogDescription>
                {articuloEditando
                  ? "Atualize as informações do artigo"
                  : "Preencha os dados do novo artigo para publicação"}
              </DialogDescription>
            </DialogHeader>
            <FormArticulo
              artigo={articuloEditando || undefined}
              onSave={handleSave}
              onClose={() => setDialogAberto(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por título ou autor..."
              className="pl-9 bg-slate-50 border-slate-200"
              value={buscaUser}
              onChange={(e) => setBuscaUser(e.target.value)}
            />
          </div>
          <div className="flex w-full md:w-auto items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              className="text-sm border border-slate-200 rounded-md bg-slate-50 px-3 py-2 text-slate-700 outline-none"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="Todas">Todas as Categorias</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {articulosFiltrados.length === 0 ? (
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500 text-sm">Nenhum artigo encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          articulosFiltrados.map((artigo) => (
            <Card
              key={artigo.id}
              className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow overflow-hidden"
            >
              <CardContent className="p-0">
                <div className="flex gap-4 p-4">
                  <div className="w-32 h-24 flex-shrink-0">
                    <img
                      src={artigo.imagem_capa}
                      alt={artigo.titulo}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                          {artigo.titulo}
                        </h3>
                        {artigo.destaque && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs whitespace-nowrap">
                            Destaque
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                        {artigo.resumo}
                      </p>
                      <div className="flex gap-2 text-xs text-slate-500">
                        <span className="px-2 py-1 bg-slate-100 rounded">
                          {artigo.categoria}
                        </span>
                        <span className="px-2 py-1 bg-slate-100 rounded">
                          {artigo.formato}
                        </span>
                        <span className="px-2 py-1 bg-slate-100 rounded">
                          {artigo.tempo_leitura}
                        </span>
                        <span className="px-2 py-1 bg-slate-100 rounded">
                          {artigo.data_criacao}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                      <span>Por: {artigo.autor}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/blog/${artigo.slug}`, "_blank")}
                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditar(artigo)}
                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(artigo.id)}
                      disabled={deletando === artigo.id}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}