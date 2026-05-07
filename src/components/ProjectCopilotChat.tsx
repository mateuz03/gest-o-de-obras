import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Props {
  projectId: string;
}

export function ProjectCopilotChat({ projectId }: Props) {
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
        .select("id, role, content, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) {
        toast({ title: "Erro ao carregar histórico", description: error.message, variant: "destructive" });
      } else {
        setMessages((data || []) as ChatRow[]);
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

    const { data, error } = await supabase
      .from("project_chats")
      .insert({ project_id: projectId, user_id: uid, role: "user", content: text })
      .select("id, role, content, created_at")
      .single();

    if (error) {
      toast({ title: "Erro ao enviar mensagem", description: error.message, variant: "destructive" });
    } else {
      setMessages((prev) => [...prev, data as ChatRow]);
      setInput("");
    }
    setSending(false);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-semibold">Copiloto IA</span>
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex w-[360px] flex-col rounded-2xl border bg-background shadow-2xl sm:w-[420px]"
          style={{ height: "min(560px, calc(100vh - 100px))" }}
        >
          <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Copiloto da Obra</p>
                <p className="text-xs opacity-80">Seu assistente de projeto</p>
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
                Nenhuma mensagem ainda. Comece a conversar com o copiloto!
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
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
                placeholder="Pergunte algo sobre a obra..."
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
