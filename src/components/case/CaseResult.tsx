import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { draftStatement } from "@/lib/case.functions";
import { daysBetween } from "@/lib/case/dates";
import { kes } from "@/lib/case/employment";
import { LAW } from "@/lib/case/law";
import { buildLetter, formatDate, type Language } from "@/lib/case/letter";
import type { CaseAssessment, EmploymentFacts, TenancyFacts } from "@/lib/case/types";
import {
  AlertOctagon,
  AlertTriangle,
  BookOpen,
  CalendarClock,
  Check,
  ClipboardCopy,
  Download,
  FileText,
  Info,
  Loader2,
  MapPin,
  Printer,
  ShieldCheck,
} from "lucide-react";

type Props = {
  today: string;
  story: string;
  assessment: CaseAssessment;
} & ({ track: "employment"; facts: EmploymentFacts } | { track: "tenancy"; facts: TenancyFacts });

function LawBadge({ id }: { id: keyof typeof LAW }) {
  const law = LAW[id];
  return (
    <span
      title={law.summary}
      className="inline-flex items-center gap-1 rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[11px] font-medium text-primary"
    >
      <BookOpen className="h-3 w-3" />
      {law.cite}
    </span>
  );
}

const findingStyle = {
  violation: {
    icon: AlertOctagon,
    className: "border-destructive/30 bg-destructive/5 text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
  },
  info: { icon: Info, className: "border-border bg-muted/40 text-foreground" },
} as const;

export function CaseResult(props: Props) {
  const { assessment: a, today } = props;
  const [included, setIncluded] = useState<string[]>(() =>
    a.lines.filter((l) => l.status === "owed").map((l) => l.id),
  );
  const [language, setLanguage] = useState<Language>("en");
  const [statement, setStatement] = useState<Record<Language, string | null | undefined>>({
    en: undefined,
    sw: undefined,
  });
  const [letter, setLetter] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);
  const draft = useServerFn(draftStatement);

  const toggle = (id: string) =>
    setIncluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const compose = (lang: Language, stmt: string | null) =>
    props.track === "employment"
      ? buildLetter({
          track: "employment",
          facts: props.facts,
          assessment: a,
          language: lang,
          today,
          statement: stmt,
          includedLineIds: included,
        })
      : buildLetter({
          track: "tenancy",
          facts: props.facts,
          assessment: a,
          language: lang,
          today,
          statement: stmt,
          includedLineIds: included,
        });

  async function writeLetter(lang: Language) {
    setLanguage(lang);
    let stmt = statement[lang];
    if (stmt === undefined && props.story.trim().length < 20) stmt = null;
    if (stmt === undefined) {
      setDrafting(true);
      try {
        const res = await draft({
          data: { story: props.story, track: props.track, language: lang },
        });
        stmt = res.statement;
      } catch {
        stmt = null;
      } finally {
        setDrafting(false);
      }
      setStatement((prev) => ({ ...prev, [lang]: stmt }));
    }
    setLetter(compose(lang, stmt ?? null));
  }

  async function copyLetter() {
    if (!letter) return;
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadLetter() {
    if (!letter) return;
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hakimtaani-letter-${today}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printLetter() {
    if (!letter) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const pre = w.document.createElement("pre");
    pre.textContent = letter;
    pre.style.cssText =
      "font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; white-space: pre-wrap; max-width: 17cm; margin: 2cm auto;";
    w.document.title = "Letter";
    w.document.body.appendChild(pre);
    w.print();
  }

  const owedLines = a.lines.filter((l) => l.status !== "discretionary");
  const discretionary = a.lines.filter((l) => l.status === "discretionary");
  const hasMoney = a.lines.length > 0;

  return (
    <div className="space-y-6">
      {hasMoney && (
        <Card className="overflow-hidden border-primary/30">
          <div className="bg-primary/5 p-6 sm:p-8">
            <p className="text-sm font-medium text-muted-foreground">
              {props.track === "employment" ? "Your employer may owe you" : "You are owed"}
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              {kes(a.totalOwed)}
            </p>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              {a.totalConditional > 0 && (
                <p>
                  + up to{" "}
                  <span className="font-semibold text-foreground">{kes(a.totalConditional)}</span>{" "}
                  more if the conditions below apply
                </p>
              )}
              {a.maxDiscretionary > 0 && (
                <p>
                  + compensation of up to{" "}
                  <span className="font-semibold text-foreground">{kes(a.maxDiscretionary)}</span>{" "}
                  that a court or labour officer can award
                </p>
              )}
            </div>
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Calculated by fixed legal rules, not AI — every figure is traceable to the provision
              shown.
            </p>
          </div>
        </Card>
      )}

      {hasMoney && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How we worked it out</CardTitle>
            <CardDescription>Tick the items you want to claim in your letter.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...owedLines, ...discretionary].map((l) => (
              <div key={l.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-3">
                    {l.status !== "discretionary" ? (
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-primary"
                        checked={included.includes(l.id)}
                        onChange={() => {
                          toggle(l.id);
                          setLetter(null);
                        }}
                      />
                    ) : (
                      <span className="mt-1 h-4 w-4" />
                    )}
                    <span>
                      <span className="font-medium text-foreground">{l.label}</span>
                      {l.status === "conditional" && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          Conditional
                        </Badge>
                      )}
                      {l.status === "discretionary" && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          Court decides
                        </Badge>
                      )}
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {l.working}
                      </span>
                      {l.note && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">{l.note}</span>
                      )}
                      <span className="mt-1.5 block">
                        <LawBadge id={l.law} />
                      </span>
                    </span>
                  </label>
                  <span className="shrink-0 font-semibold tabular-nums text-foreground">
                    {l.status === "discretionary" ? "up to " : ""}
                    {kes(l.amount)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {a.findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What the law says about your situation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {a.findings.map((f) => {
              const style = findingStyle[f.severity];
              return (
                <div key={f.id} className={`flex gap-3 rounded-lg border p-3 ${style.className}`}>
                  <style.icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">{f.title}</p>
                    <p className="text-sm text-foreground/80">{f.detail}</p>
                    <LawBadge id={f.law} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {a.deadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5 text-primary" />
              Your deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l pl-6">
              {a.deadlines.map((d) => {
                const left = daysBetween(today, d.date);
                const passed = left < 0;
                return (
                  <li key={d.id} className="relative">
                    <span
                      className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-background ${
                        passed ? "bg-muted-foreground" : d.urgent ? "bg-destructive" : "bg-primary"
                      }`}
                    />
                    <p className="font-medium text-foreground">{d.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(d.date, "en")} ·{" "}
                      <span
                        className={
                          passed
                            ? "text-muted-foreground"
                            : d.urgent
                              ? "font-semibold text-destructive"
                              : ""
                        }
                      >
                        {passed
                          ? `passed ${-left} days ago`
                          : left === 0
                            ? "today"
                            : `${left} days left`}
                      </span>
                    </p>
                    <div className="mt-1">
                      <LawBadge id={d.law} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Your letter
          </CardTitle>
          <CardDescription>
            Ready to send to your {props.track === "employment" ? "employer" : "landlord"}. Keep a
            copy and proof of delivery (WhatsApp, email, or a signed copy).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void writeLetter("en")}
              disabled={drafting}
              variant={letter && language === "en" ? "default" : "outline"}
            >
              {drafting && language === "en" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              English letter
            </Button>
            <Button
              onClick={() => void writeLetter("sw")}
              disabled={drafting}
              variant={letter && language === "sw" ? "default" : "outline"}
            >
              {drafting && language === "sw" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Barua ya Kiswahili
            </Button>
          </div>
          {letter && (
            <>
              <Textarea
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                className="field-sizing-content min-h-[420px] font-serif text-sm leading-relaxed"
              />
              {statement[language] === null && (
                <p className="text-xs text-muted-foreground">
                  Add a sentence or two describing what happened where the letter introduces your
                  case.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => void copyLetter()}>
                  {copied ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="secondary" size="sm" onClick={downloadLetter}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button variant="secondary" size="sm" onClick={printLetter}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print / save as PDF
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Where to take it
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {a.routes.map((r, i) => (
              <div key={r.id} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground">
                    {r.name}{" "}
                    <span className="text-xs font-normal text-muted-foreground">· {r.cost}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{r.why}</p>
                </div>
              </div>
            ))}
            <Button asChild variant="link" className="h-auto p-0">
              <Link to="/help">Contacts for free legal aid →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evidence to gather</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {a.evidence.map((e) => (
                <li key={e} className="flex gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {e}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {a.assumptions.length > 0 && (
        <details className="rounded-lg border p-4 text-sm">
          <summary className="cursor-pointer font-medium text-foreground">
            Assumptions behind these numbers
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {a.assumptions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-center text-xs text-muted-foreground">
        HakiMtaani gives general legal information, not legal advice. Figures are estimates based on
        what you told us — a labour officer, tribunal or court makes the final decision.
      </p>
    </div>
  );
}
