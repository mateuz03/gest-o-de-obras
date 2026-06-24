import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Loader2, Package, User as UserIcon, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { normalizeAccountType } from "@/contexts/AuthContext";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fallbackImage =
  "https://images.unsplash.com/photo-1541888081622-132d718b52f6?q=80&w=400&auto=format&fit=crop";

interface SellerInfo {
  user_id: string;
  nome: string | null;
  account_type: string | null;
  avatar_url: string | null;
}

interface SellerProduct {
  categoria: string;
  foto_url?: string | null;
  id: string;
  nome_produto: string;
  preco: number;
  unidade_medida: string;
}

export default function VendedorPerfil() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [produtos, setProdutos] = useState<SellerProduct[]>([]);
  const [tipo, setTipo] = useState<"CPF" | "CNPJ" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function resolver() {
      try {
        const [{ data: sellerData, error: sellerError }, { data: storefrontData, error: storefrontError }] =
          await Promise.all([
            supabase.rpc("get_public_seller", { p_user_id: id }),
            supabase.rpc("get_public_storefront", { _user_id: id }),
          ]);

        if (sellerError) throw sellerError;
        if (storefrontError) throw storefrontError;

        const info: SellerInfo | null = Array.isArray(sellerData)
          ? sellerData[0] ?? null
          : (sellerData as SellerInfo | null);
        const hasStorefront = Array.isArray(storefrontData)
          ? storefrontData.length > 0
          : Boolean(storefrontData);
        const tipoResolvido =
          hasStorefront || normalizeAccountType(info?.account_type) === "CNPJ" ? "CNPJ" : "CPF";

        if (cancelled) return;
        setSeller(info);
        setTipo(tipoResolvido);

        if (tipoResolvido === "CPF") {
          const { data: prodData, error: prodError } = await supabase.rpc(
            "list_public_seller_products",
            { _user_id: id }
          );

          if (prodError) throw prodError;
          if (!cancelled) {
            setProdutos(
              (prodData || []).map((produto) => ({
                ...produto,
                preco: Number(produto.preco),
              }))
            );
          }
        }
      } catch (err) {
        console.error("Erro ao resolver vendedor:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolver();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-500 font-medium">Carregando vendedor...</p>
      </div>
    );
  }

  if (tipo === "CNPJ") {
    return <Navigate to={`/loja/${id}`} replace />;
  }

  const nome = seller?.nome || "Vendedor";
  const iniciais =
    nome
      .split(" ")
      .slice(0, 2)
      .map((parte) => parte[0])
      .join("")
      .toUpperCase() || "V";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <main className="container max-w-5xl mx-auto px-4 lg:px-8 py-8">
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 bg-white text-slate-600"
            onClick={() => navigate("/marketplace")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Marketplace
          </Button>
        </div>

        <Card className="border-slate-200 mb-8">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
            <Avatar className="h-24 w-24 border-2 border-emerald-100">
              {seller?.avatar_url ? <AvatarImage src={seller.avatar_url} alt={nome} /> : null}
              <AvatarFallback className="bg-emerald-50 text-emerald-700 text-2xl font-bold">
                {iniciais}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Badge variant="outline" className="mb-2 text-xs text-slate-500">
                <UserIcon className="mr-1 h-3 w-3" /> Vendedor Pessoa Fisica
              </Badge>
              <h1 className="text-2xl font-bold text-slate-900">{nome}</h1>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-500 sm:justify-start">
                <ShoppingBag className="h-4 w-4 text-emerald-600" />
                {produtos.length}{" "}
                {produtos.length === 1 ? "material a venda" : "materiais a venda"}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mb-5 flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900">Materiais a venda</h2>
        </div>

        {produtos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="mb-2 text-lg font-medium text-slate-900">Nenhum material disponivel</h3>
            <p className="text-slate-500">Este vendedor ainda nao publicou anuncios.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {produtos.map((p) => (
              <Card key={p.id} className="overflow-hidden border-slate-200 bg-white">
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  <img
                    src={p.foto_url || fallbackImage}
                    alt={p.nome_produto}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <Badge variant="outline" className="mb-2 text-xs text-slate-500">
                    {p.categoria}
                  </Badge>
                  <h3 className="font-semibold text-slate-900 leading-tight line-clamp-2">
                    {p.nome_produto}
                  </h3>
                  <p className="mt-1 font-bold text-emerald-600">
                    {formatCurrency(Number(p.preco))}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      / {p.unidade_medida}
                    </span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
