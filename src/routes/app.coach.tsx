import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/coach")({
  component: Coach,
});

type Msg = { role: "user" | "coach"; text: string };

const SUGGESTIONS = [
  "I'm too sore today, can you lighten tomorrow's workout?",
  "I missed my long run on Saturday — how do I reschedule?",
  "Can we swap Thursday's strength for mobility?",
  "How should I fuel before my interval session?",
];

const INTRO: Msg = {
  role: "coach",
  text:
    "Hi! I'm your AI Coach. I can adjust your plan in real time — swap days, scale intensity, or rebuild a week around how you're feeling. What's on your mind?",
};

function mockReply(input: string): string {
  const q = input.toLowerCase();
  if (q.includes("sore") || q.includes("tired")) {
    return "Got it — let's protect recovery. I'll convert tomorrow's session into 25 minutes of easy mobility + a short walk. We'll move the strength block to Friday and keep your long run intact. Want me to apply this?";
  }
  if (q.includes("missed") || q.includes("reschedule")) {
    return "No stress, missing one run won't derail your plan. I'll shift the long run to Sunday at reduced volume (8 km easy) and turn Monday into a recovery jog. Your weekly load stays balanced.";
  }
  if (q.includes("swap") || q.includes("change")) {
    return "Sure thing. Swapping Thursday's strength session for a 30-minute mobility flow. I'll add the strength block back into Sunday so you don't lose the stimulus.";
  }
  if (q.includes("fuel") || q.includes("eat")) {
    return "For intervals, aim for ~60–80g of carbs about 2 hours before (oats + banana works great). Sip water in the hour leading up. If it's an early session, a small piece of toast with honey is enough.";
  }
  return "Thanks for sharing. Based on your goal and current week, I'd suggest keeping today's plan as-is and reassessing tomorrow morning. Want me to pre-adjust anything else?";
}

function Coach() {
  const [messages, setMessages] = useState<Msg[]>([INTRO]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "coach", text: mockReply(trimmed) }]);
      setThinking(false);
    }, 900);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-4xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-energy text-energy-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Coach</h1>
          <p className="text-sm text-muted-foreground">
            Ask for plan adjustments, swaps, or training advice — anytime.
          </p>
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} />
          ))}
          {thinking && (
            <div className="flex items-start gap-3">
              <Avatar role="coach" />
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                <div className="flex gap-1">
                  <Dot delay="0ms" />
                  <Dot delay="120ms" />
                  <Dot delay="240ms" />
                </div>
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="border-t bg-muted/30 px-5 py-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Try asking
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t bg-background p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message your coach…"
            className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Button type="submit" disabled={!input.trim() || thinking} className="rounded-xl">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <Avatar role={msg.role} />
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-muted text-foreground",
        )}
      >
        {msg.text}
      </div>
    </div>
  );
}

function Avatar({ role }: { role: "user" | "coach" }) {
  if (role === "user") {
    return (
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
        <User className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-energy text-energy-foreground">
      <Sparkles className="h-4 w-4" />
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
      style={{ animationDelay: delay }}
    />
  );
}
