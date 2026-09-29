import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { analyzeContract } from "@/lib/contract.functions";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import {
  AlertTriangle,
  FileText,
  Loader2,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Upload,
  MessageSquare,
  LifeBuoy,
} from "lucide-react";

export const Route = createFileRoute("/analyze")({
  component: Analyze,
  head: () => ({
    meta: [
      { title: "Contract Check — HakiMtaani" },
      {
        name: "description",
        content:
          "Upload a Kenyan lease or employment contract and see which clauses are illegal, risky, or unfair — with the exact statute cited.",
      },
      { property: "og:title", content: "Contract Check — HakiMtaani" },
      {
        property: "og:description",
        content:
          "Scan a Kenyan lease or job contract for illegal and unfair clauses, cited to Kenyan law.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Contract Check — HakiMtaani" },
      {
        name: "twitter:description",
        content:
          "Scan a Kenyan lease or job contract for illegal and unfair clauses, cited to Kenyan law.",
      },
    ],
  }),
});

type Result = Awaited<ReturnType<typeof analyzeContract>>;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


const severityStyles: Record<string, { label: string; className: string }> = {
  illegal: { label: "Illegal", className: "bg-destructive text-destructive-foreground" },
  risky: { label: "Risky", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  unfair: { label: "Unfair", className: "bg-primary/10 text-primary" },
  ok: { label: "Acceptable", className: "bg-muted text-muted-foreground" },
};

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " "),
    );
  }
  return pages.join("\n\n");
}

const SAMPLE_LEASE = `TENANCY AGREEMENT
1. The Tenant shall pay rent of KES 18,000 monthly in advance.
2. The Landlord may increase the rent at any time without notice to the Tenant.
3. The Landlord reserves the right to enter the premises at any hour without notice.
4. Should the Tenant default on rent for seven (7) days, the Landlord may lock the premises and seize the Tenant's goods without a court order.
5. The deposit of KES 36,000 is non-refundable under all circumstances.
6. The Tenant waives any right to sue the Landlord for injury or loss on the premises.
7. All repairs, including structural and plumbing, are the responsibility of the Tenant.`;

function Analyze() {
  const run = useServerFn(analyzeContract);
  const fileRef = useRef<HTMLInputElement>(null);

  const [docType, setDocType] = useState<"tenancy" | "employment">("tenancy");
  const [language, setLanguage] = useState<"en" | "sw">("en");
  const [text, setText] = useState("");
  const [documentBase64, setDocumentBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setReading(true);
    setFileName(file.name);
    try {
      const [extracted, base64] = await Promise.all([
        file.type === "application/pdf" ? extractPdfText(file) : file.text(),
        fileToBase64(file),
      ]);
      setMimeType(file.type);
      setDocumentBase64(base64);
      if (extracted.trim().length < 50) {
        setError(
          "Could not read enough text from that file. It may be a scanned image — Azure Document Intelligence will handle it once configured, or paste the text instead.",
        );
      }
      setText(extracted.trim());
    } catch {
      setError("Failed to read that file. Try pasting the contract text instead.");
    } finally {
      setReading(false);
    }
  }

  async function handleAnalyze() {
    if (text.trim().length < 50) {
      setError("Paste or upload at least a few clauses of the contract.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await run({
        data: {
          documentText: text.trim(),
          documentBase64: documentBase64 ?? undefined,
          mimeType: mimeType ?? undefined,
          docType,
          language,
        },
      });
      setResult(res);
    } catch {
      setError("The analysis could not be completed. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  const flagged = result?.clauses.filter((c) => c.severity !== "ok") ?? [];

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <ScanLine className="h-3.5 w-3.5 text-primary" />
            Evidence engine
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Contract Check</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Upload a Kenyan lease or job contract. HakiMtaani flags every clause that is illegal,
            risky, or unfair — and cites the law it breaks.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-4">
            <Button asChild variant="link" className="px-0">
              <Link to="/chat">
                <MessageSquare className="mr-1 h-4 w-4" />
                Or ask a question instead
              </Link>
            </Button>
            <Button asChild variant="link" className="px-0">
              <Link to="/help">
                <LifeBuoy className="mr-1 h-4 w-4" />
                Get human help
              </Link>
            </Button>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Give us the document</CardTitle>
            <CardDescription>PDF or text file, or paste the clauses directly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["tenancy", "employment"] as const).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={docType === t ? "default" : "outline"}
                  onClick={() => setDocType(t)}
                >
                  {t === "tenancy" ? "Lease / tenancy" : "Employment contract"}
                </Button>
              ))}
              <span className="mx-1 hidden w-px bg-border sm:block" />
              {(["en", "sw"] as const).map((l) => (
                <Button
                  key={l}
                  size="sm"
                  variant={language === l ? "secondary" : "ghost"}
                  onClick={() => setLanguage(l)}
                >
                  {l === "en" ? "English" : "Kiswahili"}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,text/plain,.txt,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={reading}>
                {reading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload PDF or text
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setText(SAMPLE_LEASE); setFileName(null); setDocumentBase64(null); setMimeType(null); setDocType("tenancy"); }}>
                Use a sample lease
              </Button>
              {fileName ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {fileName}
                </span>
              ) : null}
            </div>

            <Textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setDocumentBase64(null);
                setMimeType(null);
              }}
              rows={10}
              placeholder="Paste the contract clauses here…"
              className="resize-y font-mono text-sm"
            />

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                Your document is analysed and not stored. General legal information only.
              </p>
              <Button onClick={handleAnalyze} disabled={loading || reading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                Check my contract
              </Button>
            </div>

            {error ? (
              <p className="flex items-start gap-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {result ? (
          <section className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Verdict</CardTitle>
                    <CardDescription>{flagged.length} clause(s) need your attention.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.riskScore >= 60 ? (
                      <ShieldAlert className="h-6 w-6 text-destructive" />
                    ) : (
                      <ShieldCheck className="h-6 w-6 text-primary" />
                    )}
                    <span className="text-2xl font-bold">{Math.round(result.riskScore)}</span>
                    <span className="text-sm text-muted-foreground">/100 risk</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${result.riskScore >= 60 ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, Math.max(0, result.riskScore))}%` }}
                  />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{result.summary}</p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Clause-by-clause findings</h2>
              {result.clauses.map((clause, i) => {
                const style = severityStyles[clause.severity] ?? severityStyles["ok"]!;
                return (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={style.className}>{style.label}</Badge>
                        <Badge variant="outline">
                          {clause.statute}
                          {clause.section ? ` · ${clause.section}` : ""}
                        </Badge>
                        {clause.verified ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-primary"
                            title="This citation matches a provision in HakiMtaani's legal library."
                          >
                            <ShieldCheck className="h-3.5 w-3.5" /> Citation verified
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"
                            title="We could not match this citation to our legal library. Confirm it with a legal aid clinic before relying on it."
                          >
                            <AlertTriangle className="h-3.5 w-3.5" /> Citation not verified
                          </span>
                        )}
                      </div>
                      <CardTitle className="mt-2 text-base">{clause.issue}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground">
                        “{clause.quote}”
                      </blockquote>
                      <p className="leading-relaxed">{clause.explanation}</p>
                      <p className="rounded-md bg-muted/60 p-3 leading-relaxed">
                        <span className="font-semibold">What you can do: </span>
                        {clause.whatToDo}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {result.missingProtections.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Protections missing from this document</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {result.missingProtections.map((m, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{m.title}</CardTitle>
                        <CardDescription>{m.statute}</CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">{m.why}</CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}

            <FeedbackButtons
              eventTypePrefix="contract"
              metadata={{
                docType,
                language,
                riskScore: result.riskScore,
                flaggedClauses: flagged.length,
              }}
            />

            <p className="pb-8 text-xs text-muted-foreground">
              HakiMtaani provides general legal information, not legal advice. For a dispute, contact
              a legal aid clinic or an advocate.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
