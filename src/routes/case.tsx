import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { FactsForm } from "@/components/case/FactsForm";
import { CaseResult } from "@/components/case/CaseResult";
import {
  EMPLOYMENT_FIELDS,
  EMPTY_EMPLOYMENT,
  EMPTY_TENANCY,
  TENANCY_FIELDS,
} from "@/components/case/fact-fields";
import { extractCaseFacts } from "@/lib/case.functions";
import { assessEmployment, kes } from "@/lib/case/employment";
import { assessTenancy } from "@/lib/case/tenancy";
import type { EmploymentFacts, TenancyFacts, Track } from "@/lib/case/types";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Gavel,
  Home,
  Loader2,
  Scale,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/case")({
  component: CaseBuilder,
  head: () => ({
    meta: [
      { title: "Build Your Case — HakiMtaani" },
      {
        name: "description",
        content:
          "Tell HakiMtaani what happened at work or with your landlord. Get what you're owed under Kenyan law, your deadlines, and a ready-to-send demand letter in English or Kiswahili.",
      },
      { property: "og:title", content: "Build Your Case — HakiMtaani" },
      {
        property: "og:description",
        content:
          "From your story to a cited demand letter: terminal dues, deposits and eviction, under Kenyan law.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
});

const EXAMPLES: { label: string; icon: typeof Briefcase; story: string }[] = [
  {
    label: "Fired without notice",
    icon: Briefcase,
    story:
      "Nilikuwa cashier kwa Sunrise Supermarket tangu March 2021, nikilipwa 30k kwa mwezi. Friday iliyopita manager aliniambia nisirudi kazi, hakunipea sababu wala notice. Sijachukua leave tangu March. Hawakuwa wananikata NSSF. Pia sijapewa certificate of service. Jina langu ni Mary Wanjiku.",
  },
  {
    label: "Deposit not returned",
    icon: Home,
    story:
      "I moved out of my bedsitter in Umoja at the end of last month. Rent was 12,000 a month and I paid a 12,000 deposit. The landlord, Mr Kamau, says he is keeping all of it for repainting even though there was no damage. I owed nothing in rent. My name is Brian Otieno.",
  },
  {
    label: "Locked out by landlord",
    icon: Home,
    story:
      "Landlord amefunga mlango wangu jana usiku na kutoa mlango wa nyuma kwa sababu nilichelewa rent ya mwezi mmoja. Hakuonyesha court order yoyote. Nakaa Kayole, rent ni 6,500 kwa mwezi.",
  },
  {
    label: "Shop rent hike",
    icon: Gavel,
    story:
      "I run a salon in Githurai 45. Ten days ago the landlord sent me a WhatsApp message saying rent goes up from 15,000 to 22,000 from the 1st of next month. It was not on any official form. There is no written lease.",
  },
];

function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Step = "story" | "facts" | "result";

function CaseBuilder() {
  const extract = useServerFn(extractCaseFacts);
  const [today] = useState(localToday);
  const [step, setStep] = useState<Step>("story");
  const [story, setStory] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [track, setTrack] = useState<Track>("employment");
  const [employment, setEmployment] = useState<EmploymentFacts>(EMPTY_EMPLOYMENT);
  const [tenancy, setTenancy] = useState<TenancyFacts>(EMPTY_TENANCY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assessment = useMemo(
    () =>
      track === "employment" ? assessEmployment(employment, today) : assessTenancy(tenancy, today),
    [track, employment, tenancy, today],
  );

  async function buildFromStory(text: string) {
    if (text.trim().length < 20 || loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await extract({ data: { story: text, today } });
      if (res.track === "unsupported") {
        setError(
          "HakiMtaani can build cases about jobs and wages, or rent and landlords. For other problems, try the chat or contact legal aid.",
        );
        return;
      }
      setSummary(res.summary || null);
      setTrack(res.track);
      if (res.track === "employment") setEmployment(res.facts);
      else setTenancy(res.facts);
      setStep("facts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function startManual(t: Track) {
    setTrack(t);
    setSummary(null);
    setStep("facts");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <span className="font-semibold">HakiMtaani</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Button asChild variant="ghost" size="sm">
            <Link to="/chat">Ask</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/analyze">Contract Check</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/help">Get help</Link>
          </Button>
        </nav>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <ol className="mb-8 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {(["story", "facts", "result"] as const).map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-6 bg-border" />}
              <span
                className={`rounded-full px-2.5 py-1 ${step === s ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                {i + 1}.{" "}
                {s === "story" ? "Your story" : s === "facts" ? "Check the facts" : "Your case"}
              </span>
            </li>
          ))}
        </ol>

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {step === "story" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Build your case</h1>
              <p className="mt-2 text-muted-foreground">
                Tell us what happened — in English, Kiswahili or Sheng. We'll work out what you're
                owed under Kenyan law, your deadlines, and write the letter to send.
              </p>
            </div>

            <Card>
              <CardContent className="space-y-3 p-4 sm:p-6">
                <Textarea
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  placeholder="e.g. I worked as a cashier from March 2021 for 30,000 a month. Last Friday my manager told me not to come back, with no reason and no notice…"
                  className="min-h-[160px]"
                />
                <div className="flex items-center justify-between gap-2">
                  <VoiceRecorder
                    disabled={loading}
                    onError={setError}
                    onTranscript={(text) => {
                      setError(null);
                      setStory((prev) => (prev ? `${prev} ${text}` : text));
                    }}
                  />
                  <Button
                    onClick={() => void buildFromStory(story)}
                    disabled={loading || story.trim().length < 20}
                    className="gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Build my case
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Or try an example</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => setStory(ex.story)}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <ex.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      <span className="font-medium">{ex.label}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                        {ex.story}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Prefer a form?{" "}
              <button
                className="underline underline-offset-2"
                onClick={() => startManual("employment")}
              >
                Job or wages
              </button>{" "}
              ·{" "}
              <button
                className="underline underline-offset-2"
                onClick={() => startManual("tenancy")}
              >
                Rent or landlord
              </button>
            </p>
          </div>
        )}

        {step === "facts" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Check the facts</h1>
              <p className="mt-1 text-muted-foreground">
                {summary ?? "Fill in what you know."} Correct anything we got wrong — the numbers
                depend on it.
              </p>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {track === "employment" ? "Your job" : "Your tenancy"}
                </CardTitle>
                {assessment.missing.length > 0 && (
                  <CardDescription className="text-destructive">
                    Fill in the fields marked "needed" to see your full case.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {track === "employment" ? (
                  <FactsForm
                    fields={EMPLOYMENT_FIELDS}
                    facts={employment}
                    missing={assessment.missing}
                    onChange={setEmployment}
                  />
                ) : (
                  <FactsForm
                    fields={TENANCY_FIELDS}
                    facts={tenancy}
                    missing={assessment.missing}
                    onChange={setTenancy}
                  />
                )}
              </CardContent>
            </Card>

            <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
              <Button variant="ghost" onClick={() => setStep("story")} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <div className="text-right text-sm">
                {assessment.totalOwed > 0 && (
                  <span className="mr-3 text-muted-foreground">
                    So far:{" "}
                    <span className="font-semibold text-foreground">
                      {kes(assessment.totalOwed)}
                    </span>
                  </span>
                )}
                <Button
                  onClick={() => setStep("result")}
                  disabled={assessment.missing.length > 0}
                  className="gap-1"
                >
                  See my case <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "result" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Your case</h1>
              <Button variant="ghost" size="sm" onClick={() => setStep("facts")} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Edit facts
              </Button>
            </div>
            {track === "employment" ? (
              <CaseResult
                track="employment"
                facts={employment}
                assessment={assessment}
                story={story}
                today={today}
              />
            ) : (
              <CaseResult
                track="tenancy"
                facts={tenancy}
                assessment={assessment}
                story={story}
                today={today}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
