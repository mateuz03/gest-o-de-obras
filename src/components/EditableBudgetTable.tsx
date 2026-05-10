import { useEffect, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BudgetItem, SinapiMatch } from "@/lib/types";
import { Pencil, Check, X, Plus, Link2, Loader2 } from "lucide-react";

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toNum(v: number | string | undefined | null): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : v;
  return isNaN(n) ? 0 : n;
}

interface SinapiSuggestion {
  codigo: string;
  descricao: string;
  unidade: string | null;
  preco_total: number | null;
  preco_material: number | null;
  preco_mao_de_obra: number | null;
}

interface DescricaoAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPick: (s: SinapiSuggestion) => void;
}

function DescricaoAutocomplete({ value, onChange, onPick }: DescricaoAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SinapiSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!value || value.trim().length < 3) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("sinapi_base_oficial")
        .select("codigo, descricao, unidade, preco_total, preco_material, preco_mao_de_obra")
        .ilike("descricao", `%${value}%`)
        .limit(8);
      setResults((data as SinapiSuggestion[]) || []);
      setLoading(false);
      setOpen(true);
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Descrição do item..."
        className="h-8 text-xs"
      />
      {open && (loading || results.length > 0) && (
        <div className="absolute z-50 mt-1 max-h-72 w-[420px] overflow-y-auto rounded-md border bg-popover shadow-lg">
          {loading && (
            <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Buscando na SINAPI...
            </div>
          )}
          {!loading && results.map((r) => {
            const preco = r.preco_total ?? ((r.preco_material || 0) + (r.preco_mao_de_obra || 0));
            return (
              <button
                key={r.codigo}
                type="button"
                onClick={() => {
                  onPick(r);
                  setOpen(false);
                }}
                className="block w-full border-b px-3 py-2 text-left text-xs hover:bg-accent last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{r.codigo}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(preco)}</span>
                </div>
                <div className="mt-0.5 line-clamp-2 text-foreground">{r.descricao}</div>
                {r.unidade && <span className="text-[10px] text-muted-foreground">Unid: {r.unidade}</span>}
              </button>
            );
          })}
          {!loading && results.length === 0 && (
            <div className="p-2 text-xs text-muted-foreground">Nenhum resultado</div>
          )}
        </div>
      )}
    </div>
  );
}

interface EditableBudgetTableProps {
  items: BudgetItem[];
  sinapiMatches: Record<string, { matched: boolean; matches: SinapiMatch[] }>;
  onLinkClick: (item: BudgetItem, suggestions: SinapiMatch[]) => void;
  onUpdateItem: (originalItemId: string, updated: BudgetItem) => Promise<void>;
  onAddItem?: (newItem: BudgetItem) => Promise<void>;
}

const EMPTY_DRAFT = (nextNumber: string): BudgetItem => ({
  item: nextNumber,
  descricao: "",
  local_aplicacao: "",
  fornecedor: "",
  marca: "",
  quantidade: 1,
  unidade: "un",
  preco_unitario: 0,
  preco_total: 0,
  origem_preco: "Manual",
  codigo_sinapi: "",
});

export function EditableBudgetTable({
  items,
  sinapiMatches,
  onLinkClick,
  onUpdateItem,
  onAddItem,
}: EditableBudgetTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BudgetItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<BudgetItem | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(it: BudgetItem) {
    setEditingId(it.item);
    setDraft({ ...it });
    setAdding(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function startAdd() {
    const maxNum = items.reduce((m, it) => Math.max(m, parseInt(String(it.item)) || 0), 0);
    setNewDraft(EMPTY_DRAFT(String(maxNum + 1)));
    setAdding(true);
    setEditingId(null);
  }

  function cancelAdd() {
    setAdding(false);
    setNewDraft(null);
  }

  function applySinapiPick(target: BudgetItem, s: SinapiSuggestion): BudgetItem {
    const preco = s.preco_total ?? ((s.preco_material || 0) + (s.preco_mao_de_obra || 0));
    const qty = toNum(target.quantidade);
    return {
      ...target,
      descricao: s.descricao,
      codigo_sinapi: s.codigo,
      unidade: s.unidade || target.unidade,
      preco_unitario: preco,
      preco_total: preco * qty,
      origem_preco: "SINAPI",
    };
  }

  function updateDraft(patch: Partial<BudgetItem>, isNew: boolean) {
    const base = isNew ? newDraft : draft;
    if (!base) return;
    const merged = { ...base, ...patch };
    // Reactive total
    if ("quantidade" in patch || "preco_unitario" in patch) {
      merged.preco_total = toNum(merged.quantidade) * toNum(merged.preco_unitario);
    }
    if (isNew) setNewDraft(merged);
    else setDraft(merged);
  }

  async function saveEdit() {
    if (!draft || !editingId) return;
    setSaving(true);
    try {
      const finalItem = { ...draft, preco_total: toNum(draft.quantidade) * toNum(draft.preco_unitario) };
      await onUpdateItem(editingId, finalItem);
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  async function saveAdd() {
    if (!newDraft || !onAddItem) return;
    setSaving(true);
    try {
      const finalItem = { ...newDraft, preco_total: toNum(newDraft.quantidade) * toNum(newDraft.preco_unitario) };
      await onAddItem(finalItem);
      cancelAdd();
    } finally {
      setSaving(false);
    }
  }

  function renderEditingRow(d: BudgetItem, isNew: boolean) {
    return (
      <TableRow className="bg-emerald-50/40 align-top">
        <TableCell>
          <Input
            value={String(d.item)}
            onChange={(e) => updateDraft({ item: e.target.value }, isNew)}
            className="h-8 w-14 text-xs font-mono"
          />
        </TableCell>
        <TableCell className="min-w-[260px]">
          <DescricaoAutocomplete
            value={d.descricao}
            onChange={(v) => updateDraft({ descricao: v }, isNew)}
            onPick={(s) => {
              const patched = applySinapiPick(d, s);
              if (isNew) setNewDraft(patched);
              else setDraft(patched);
            }}
          />
        </TableCell>
        <TableCell>
          <Input
            value={d.local_aplicacao || ""}
            onChange={(e) => updateDraft({ local_aplicacao: e.target.value }, isNew)}
            className="h-8 text-xs"
          />
        </TableCell>
        <TableCell>
          <Input
            value={d.fornecedor || ""}
            onChange={(e) => updateDraft({ fornecedor: e.target.value }, isNew)}
            className="h-8 text-xs"
          />
        </TableCell>
        <TableCell>
          <Input
            value={d.marca || ""}
            onChange={(e) => updateDraft({ marca: e.target.value }, isNew)}
            className="h-8 text-xs"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            step="any"
            value={String(d.quantidade ?? "")}
            onChange={(e) => updateDraft({ quantidade: e.target.value }, isNew)}
            className="h-8 w-20 text-right text-xs tabular-nums"
          />
        </TableCell>
        <TableCell>
          <Input
            value={d.unidade || ""}
            onChange={(e) => updateDraft({ unidade: e.target.value }, isNew)}
            className="h-8 w-16 text-xs"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            step="any"
            value={String(d.preco_unitario ?? "")}
            onChange={(e) => updateDraft({ preco_unitario: e.target.value }, isNew)}
            className="h-8 w-24 text-right text-xs tabular-nums"
          />
        </TableCell>
        <TableCell className="text-right font-medium tabular-nums text-emerald-700">
          {formatCurrency(toNum(d.quantidade) * toNum(d.preco_unitario))}
        </TableCell>
        <TableCell>
          <Input
            value={d.codigo_sinapi || ""}
            onChange={(e) => updateDraft({ codigo_sinapi: e.target.value }, isNew)}
            className="h-8 w-24 text-xs font-mono"
          />
        </TableCell>
        <TableCell className="whitespace-nowrap">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="default"
              className="h-7 bg-emerald-600 hover:bg-emerald-700"
              onClick={isNew ? saveAdd : saveEdit}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              onClick={isNew ? cancelAdd : cancelEdit}
              disabled={saving}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-16">Item</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>Fornec.</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead className="text-right">Quant</TableHead>
            <TableHead>Unid</TableHead>
            <TableHead className="text-right">R$ Unit.</TableHead>
            <TableHead className="text-right">R$ Total</TableHead>
            <TableHead>SINAPI</TableHead>
            <TableHead className="w-24 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, i) => {
            if (editingId === item.item && draft) return renderEditingRow(draft, false);
            const match = sinapiMatches[item.item];
            const isConciliado = item.preco_conciliado;
            const hasSinapiCode = !!item.codigo_sinapi;
            const zebra = items.length > 5 && i % 2 === 1 ? "bg-slate-50/60" : "";

            return (
              <TableRow
                key={item.item + i}
                className={
                  item.alerta_revisao
                    ? "bg-red-50 border-l-4 border-l-red-500"
                    : isConciliado
                    ? "bg-green-50/50"
                    : zebra
                }
              >
                <TableCell className="font-mono text-xs">{item.item}</TableCell>
                <TableCell className="text-sm">
                  {item.descricao}
                  {item.perda_aplicada && (
                    <span className="ml-1 text-xs text-muted-foreground">(perda: {item.perda_aplicada})</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {item.local_aplicacao ? (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {item.local_aplicacao}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.fornecedor}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.marca}</TableCell>
                <TableCell className="text-right tabular-nums">{item.quantidade}</TableCell>
                <TableCell>{item.unidade}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(item.preco_unitario)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatCurrency(item.preco_total)}</TableCell>
                <TableCell>
                  {isConciliado ? (
                    <Badge
                      className="text-xs bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                      onClick={() => onLinkClick(item, match?.matches || [])}
                    >
                      ✓ {item.codigo_sinapi}
                    </Badge>
                  ) : hasSinapiCode ? (
                    <Badge variant="outline" className="text-xs">
                      {item.codigo_sinapi}
                    </Badge>
                  ) : match && match.matched ? (
                    <Badge
                      className="text-xs bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
                      onClick={() => onLinkClick(item, match.matches)}
                    >
                      <Link2 className="h-3 w-3 mr-1" /> Vincular ({match.matches.length})
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => startEdit(item)}
                    title="Editar item"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {adding && newDraft && renderEditingRow(newDraft, true)}
        </TableBody>
      </Table>

      {onAddItem && !adding && (
        <div className="mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={startAdd}
            className="border-dashed border-emerald-400 text-emerald-700 hover:bg-emerald-50"
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar Item Manual
          </Button>
        </div>
      )}
    </div>
  );
}
