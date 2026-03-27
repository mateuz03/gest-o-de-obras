import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { SinapiMatch } from "@/lib/types";
import { Search, Loader2, CheckCircle2 } from "lucide-react";

interface SinapiLinkModalProps {
  open: boolean;
  onClose: () => void;
  itemDescricao: string;
  itemCode: string;
  suggestions?: SinapiMatch[];
  onSelect: (match: SinapiMatch) => void;
}

export function SinapiLinkModal({ open, onClose, itemDescricao, itemCode, suggestions = [], onSelect }: SinapiLinkModalProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SinapiMatch[]>(suggestions);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (!search.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("referencia_sinapi")
      .select("*")
      .ilike("descricao", `%${search}%`)
      .limit(10);
    setResults((data as SinapiMatch[]) || []);
    setSearching(false);
  }

  function formatCurrency(value: number | null) {
    if (value == null) return "—";
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular Preço SINAPI</DialogTitle>
          <DialogDescription>
            Item: <strong>{itemCode}</strong> — {itemDescricao}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Buscar na base SINAPI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching} size="sm">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {results.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Unid</TableHead>
                  <TableHead className="text-right">Material</TableHead>
                  <TableHead className="text-right">M.O.</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{r.codigo}</Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{r.descricao}</TableCell>
                    <TableCell className="text-xs">{r.unidade}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(r.preco_material)}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(r.preco_mao_de_obra)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="default" onClick={() => { onSelect(r); onClose(); }}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Usar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {suggestions.length === 0 ? "Busque um item na base SINAPI para vincular o preço." : "Nenhum resultado encontrado."}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
