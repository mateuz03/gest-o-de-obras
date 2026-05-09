import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, X, Send, Loader2, Check, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

export interface CopilotBudgetItem {
  id: string;          // unique id (we'll use item.item code)
  descricao: string;
  quantidade: number | string;
  unidade?: string;
  preco_unitario: number | string;
  etapa?: string;
}

export interface ProposalPayload {
  id_do_item: string;
  novo_nome: string;
  nova_quantidade: number;
  novo_preco_unitario: number;
  justificativa_da_mudanca: string;
}

interface ChatRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  proposal?: ProposalPayload | null;
  proposal_status?: "pending" | "approved" | "rejected" | null;
}

interface Props {
  projectId: string;
  budgetItems: CopilotBudgetItem[];
  onApplyProposal: (proposal: ProposalPayload) => Promise<boolean> | boolean;
}

const fmtBRL = (v: number | string) => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return String(v);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export function ProjectCopilotChat({ projectId, budgetItems, onApplyProposal }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !projectId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("project_chats")
        .select("id, role, content, created_at, proposal, proposal_status")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) {
        toast({ title: "Erro ao carregar histórico", description: error.message, variant: "destructive" });
      } else {
        setMessages((data || []) as unknown as ChatRow[]);
      }
      setLoading(false);
    })();
  }, [open, projectId, toast]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      toast({ title: "Faça login para usar o copiloto", variant: "destructive" });
      setSending(false);
      return;
    }

    // Save user message
    const { data: userMsg, error: insertErr } = await supabase
      .from("project_chats")
      .insert({ project_id: projectId, user_id: uid, role: "user", content: text })
      .select("id, role, content, created_at, proposal, proposal_status")
      .single();

    if (insertErr) {
      toast({ title: "Erro ao enviar", description: insertErr.message, variant: "destructive" });
      setSending(false);
      return;
    }

    const newHistory = [...messages, userMsg as unknown as ChatRow];
    setMessages(newHistory);
    setInput("");

    // Call edge function
    try {
      const { data, error } = await supabase.functions.invoke("project-copilot", {
        body: {
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          budget_items: budgetItems,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const assistantContent: string = data?.reply || "";
      const proposal: ProposalPayload | null = data?.proposal || null;

      const { data: assistantMsg, error: aErr } = await supabase
        .from("project_chats")
        .insert({
          project_id: projectId,
          user_id: uid,
          role: "assistant",
          content: assistantContent,
          proposal: proposal as any,
          proposal_status: proposal ? "pending" : null,
        })
        .select("id, role, content, created_at, proposal, proposal_status")
        .single();

      if (aErr) throw aErr;
      setMessages((prev) => [...prev, assistantMsg as unknown as ChatRow]);
    } catch (err: any) {
      toast({
        title: "Erro do copiloto",
        description: err?.message || "Falha ao chamar a IA",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const updateProposalStatus = async (msgId: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("project_chats")
      .update({ proposal_status: status })
      .eq("id", msgId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, proposal_status: status } : m)),
    );
    return true;
  };

  const handleApprove = async (msg: ChatRow) => {
    if (!msg.proposal) return;
    const ok = await onApplyProposal(msg.proposal);
    if (ok) {
      await updateProposalStatus(msg.id, "approved");
      toast({ title: "✅ Alteração aplicada", description: "Orçamento atualizado com sucesso." });
    }
  };

  const handleReject = async (msg: ChatRow) => {
    await updateProposalStatus(msg.id, "rejected");
    toast({ title: "Proposta recusada" });
  };

  const renderProposalCard = (msg: ChatRow) => {
    const p = msg.proposal!;
    const status = msg.proposal_status || "pending";
    const current = budgetItems.find((b) => b.id === p.id_do_item);

    return (
      <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <Sparkles className="h-3.5 w-3.5" /> Proposta de Edição do Copiloto
        </div>

        <div className="text-xs text-muted-foreground">
          Item: <span className="font-mono">{p.id_do_item}</span>
        </div>

        <div className="grid grid-cols-[auto,1fr,auto,1fr] gap-x-2 gap-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Nome</span>
          <span className="line-through text-muted-foreground truncate">{current?.descricao || "—"}</span>
          <span>→</span>
          <span className="font-medium">{p.novo_nome}</span>

          <span className="font-semibold text-muted-foreground">Qtd</span>
          <span className="line-through text-muted-foreground">{current?.quantidade ?? "—"}</span>
          <span>→</span>
          <span className="font-medium">{p.nova_quantidade}</span>

          <span className="font-semibold text-muted-foreground">R$ Unit</span>
          <span className="line-through text-muted-foreground">{current ? fmtBRL(current.preco_unitario) : "—"}</span>
          <span>→</span>
          <span className="font-medium">{fmtBRL(p.novo_preco_unitario)}</span>
        </div>

        <div className="text-xs bg-background/60 rounded p-2 italic">
          💡 {p.justificativa_da_mudanca}
        </div>

        {status === "pending" && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => handleReject(msg)}>
              <XCircle className="h-3.5 w-3.5 mr-1" /> Recusar
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleApprove(msg)}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
            </Button>
          </div>
        )}
        {status === "approved" && (
          <div className="text-xs text-green-700 dark:text-green-400 font-semibold flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> Alteração aplicada
          </div>
        )}
        {status === "rejected" && (
          <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" /> Proposta recusada
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-white shadow-xl hover:shadow-2xl hover:bg-emerald-700 transition-all hover:scale-105"
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-semibold">Copiloto IA</span>
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex w-[380px] flex-col rounded-2xl border bg-background shadow-2xl sm:w-[440px]"
          style={{ height: "min(620px, calc(100vh - 80px))" }}
        >
          <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Copiloto da Obra</p>
                <p className="text-xs opacity-80">Pode propor edições no orçamento</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/20 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {loading && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                Pergunte algo ou peça para ajustar um item do orçamento.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:my-1">
                      <ReactMarkdown>{m.content || ""}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                  {m.role === "assistant" && m.proposal && renderProposalCard(m)}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ex: aumentar a quantidade de cimento em 10%..."
                disabled={sending}
                className="flex-1 rounded-full bg-muted/50"
              />
              <Button
                size="icon"
                onClick={send}
                disabled={!input.trim() || sending}
                className="h-9 w-9 rounded-full shrink-0"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
