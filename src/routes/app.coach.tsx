import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, User, Copy, Edit2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { chatCoach } from "@/lib/ai.functions";
import { getChatMessages } from "@/lib/data";
import { toast } from "sonner";

export const Route = createFileRoute("/app/coach")({
  component: Coach,
});

type Msg = {
  role: "user" | "assistant";
  content: string;
  id?: string;
};

function Coach() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const send = useServerFn(chatCoach);

  useEffect(() => {
    getChatMessages().then((hist) => {
      if (hist.length > 0) {
        setMessages(
          hist.map((m, i) => ({
            id: `msg-${i}`,
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        );
      } else {
        setMessages([
          {
            role: "assistant",
            content:
              "Olá! Sou seu Treinador IA do HYBRO. Como você está se sentindo hoje? Posso ajustar seu plano, dar dicas de recuperação ou te ajudar no que precisar.",
          },
        ]);
      }
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    const userMsg: Msg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const { reply } = await send({ data: { message: trimmed } });
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: reply,
        },
      ]);
    } catch (err) {
      toast.error("Erro ao se comunicar com o treinador");
    } finally {
      setThinking(false);
    }
  }

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content);
    toast.success("Mensagem copiada!");
  }

  function startEditing(msg: Msg) {
    if (msg.role !== "user") return;
    setEditingId(msg.id!);
    setEditText(msg.content);
  }

  function saveEdit() {
    if (!editingId || !editText.trim()) return;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === editingId ? { ...msg, content: editText.trim() } : msg
      )
    );
    setEditingId(null);
    setEditText("");
    toast.success("Mensagem editada");
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-4xl flex-col px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-energy to-primary text-white">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Treinador IA</h1>
          <p className="text-muted-foreground">Seu coach pessoal de corrida e força</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-border/60 shadow-xl rounded-3xl">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-8 bg-gradient-to-b from-background to-muted/30"
        >
          {messages.map((msg, i) => (
            <div
              key={msg.id || i}
              className={cn("flex gap-4 group", msg.role === "user" && "flex-row-reverse")}
            >
              <div
                className={cn(
                  "h-9 w-9 rounded-2xl flex-shrink-0 flex items-center justify-center",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-energy text-energy-foreground"
                )}
              >
                {msg.role === "user" ? (
                  <User className="h-5 w-5" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
              </div>

              <div
                className={cn(
                  "max-w-[75%] rounded-3xl px-5 py-3.5 relative",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-card border border-border rounded-tl-none"
                )}
              >
                {editingId === msg.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 bg-background text-foreground rounded-xl px-3 py-2 text-sm border"
                      autoFocus
                    />
                    <Button size="sm" onClick={saveEdit}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-[15.5px] leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                )}

                <div className="absolute -bottom-2 right-3 opacity-0 group-hover:opacity-100 transition-all flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-background/80 backdrop-blur"
                    onClick={() => copyMessage(msg.content)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {msg.role === "user" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full bg-background/80 backdrop-blur"
                      onClick={() => startEditing(msg)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex gap-4">
              <div className="h-9 w-9 rounded-2xl bg-energy flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-energy-foreground" />
              </div>
              <div className="bg-card border border-border rounded-3xl px-5 py-4">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce" />
                  <div className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce delay-150" />
                  <div className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce delay-300" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-5 bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="relative"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreva sua mensagem... (ex: Corri demais ontem, o que faço?)"
              className="w-full rounded-3xl border border-input bg-muted/50 px-6 py-4 pr-16 text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
            <Button
              type="submit"
              disabled={!input.trim() || thinking}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-2xl h-10 w-10"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
          <p className="text-center text-[10px] text-muted-foreground mt-3">
            O Treinador IA pode ajustar seu plano automaticamente
          </p>
        </div>
      </Card>
    </div>
  );
}
