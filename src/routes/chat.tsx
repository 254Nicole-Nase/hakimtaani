import { useState, useRef, useEffect } from "react";
import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { askLegalQuestion } from "@/lib/legal.functions";
import { ArrowUp, Bot, User, Loader2, AlertCircle, Scale, FileSearch, LifeBuoy, BarChart3, Gavel, ShieldCheck, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/chat")({
  component: Chat,
  head: () => ({
    meta: [
      { title: "Chat — HakiMtaani" },
      {
        name: "description",
        content:
          "Ask HakiMtaani about tenancy, employment, and consumer rights in Kenya. Cited, plain-language answers.",
      },
      { property: "og:title", content: "Chat — HakiMtaani" },
      {
        property: "og:description",
        content:
          "Ask HakiMtaani about tenancy, employment, and consumer rights in Kenya. Cited, plain-language answers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Chat — HakiMtaani" },
      {
        name: "twitter:description",
        content:
          "Ask HakiMtaani about tenancy, employment, and consumer rights in Kenya. Cited, plain-language answers.",
      },
    ],
  }),
});

type Message =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      topic: string;
      citations: { index: number; documentTitle: string; content: string }[];
      verification?: { checked: number; verified: number; unverified: string[] } | undefined;
    };

const suggestions = [
  "Can my landlord increase rent without notice?",
  "What notice must my employer give before firing me?",
  "Can I return a defective phone for a refund?",
  "My landlord locked me out — is that legal?",
  "Am I entitled to a payslip every month?",
];

function Chat() {
  const search = useSearch({ from: "/chat" }) as { topic?: string };
  const initialTopic = search.topic ?? "";
  const ask = useServerFn(askLegalQuestion);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Habari! Ask me about tenancy, employment, or consumer rights in Kenya. I will cite the legal sources I used.",
      topic: "General",
      citations: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialTopic) {
      setInput(`I have a ${initialTopic} question: `);
    }
  }, [initialTopic]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const submitQuestion = async (question: string) => {
    if (!question.trim() || loading) return;
    setError(null);
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");

    try {
      const result = await ask({ data: { question } });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.answer,
          topic: result.topic,
          citations: result.citations,
          verification: result.verification,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuestion(input);
  };

  return (
    <main className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h1 className="font-semibold">HakiMtaani</h1>
        </Link>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/case">
              <Gavel className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Build my case</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/analyze">
              <FileSearch className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Contract Check</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/help">
              <LifeBuoy className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Get help</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/impact">
              <BarChart3 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Impact</span>
            </Link>
          </Button>
          <Badge variant="outline" className="hidden text-xs md:inline-flex">
            General info only
          </Badge>
        </div>
      </header>

      <ScrollArea ref={scrollRef} className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <Card className={`max-w-[85%] sm:max-w-[75%] ${msg.role === "user" ? "bg-primary" : ""}`}>
                <CardContent className="p-4">
                  {msg.role === "assistant" && (
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{msg.topic}</span>
                    </div>
                  )}
                  <div
                    className={`whitespace-pre-wrap text-sm ${
                      msg.role === "user" ? "text-primary-foreground" : "text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && msg.citations.length > 0 && (
                    <div className="mt-4 space-y-2 border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground">Sources</p>
                      {msg.citations.map((c) => (
                        <div key={c.index} className="rounded-md bg-muted p-2 text-xs text-foreground">
                          <span className="font-semibold text-primary">[{c.index}]</span>{" "}
                          {c.documentTitle}: {c.content}
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.role === "assistant" && msg.verification && msg.verification.checked > 0 && (
                    <div
                      className={`mt-3 flex items-start gap-1.5 rounded-md p-2 text-xs ${
                        msg.verification.unverified.length === 0
                          ? "bg-primary/5 text-primary"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {msg.verification.unverified.length === 0 ? (
                        <>
                          <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
                          All {msg.verification.checked} legal reference
                          {msg.verification.checked === 1 ? "" : "s"} checked against the source text.
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                          {msg.verification.verified} of {msg.verification.checked} references verified.
                          Could not match: {msg.verification.unverified.join(", ")} — confirm with legal
                          aid before relying on {msg.verification.unverified.length === 1 ? "it" : "them"}.
                        </>
                      )}
                    </div>
                  )}
                  {msg.role === "assistant" && (
                    <FeedbackButtons eventTypePrefix="question" metadata={{ topic: msg.topic }} />
                  )}
                </CardContent>
              </Card>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <Card>
                <CardContent className="p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
      </ScrollArea>

      {messages.length <= 1 && (
        <div className="border-t bg-muted/30 px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <p className="mb-2 text-xs text-muted-foreground">Try asking</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => submitQuestion(s)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="border-t bg-card px-4 py-4 sm:px-6"
      >
        <div className="mx-auto flex max-w-3xl gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your legal question, or tap the mic to speak…"
            className="min-h-[56px] resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <VoiceRecorder
            disabled={loading}
            onError={setError}
            onTranscript={(text) => {
              setError(null);
              void submitQuestion(text);
            }}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} className="shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
          HakiMtaani is not a lawyer.{" "}
          <Link to="/help" className="underline underline-offset-2 hover:text-foreground">
            Get human help
          </Link>{" "}
          for urgent or complex matters.
        </p>
      </form>
    </main>
  );
}
