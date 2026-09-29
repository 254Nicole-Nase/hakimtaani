import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getImpactStats } from "@/lib/metrics.functions";
import {
  BarChart3,
  MessageSquare,
  FileSearch,
  LifeBuoy,
  ShieldAlert,
  Loader2,
  Scale,
  Star,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

export const Route = createFileRoute("/impact")({
  component: Impact,
  head: () => ({
    meta: [
      { title: "Pilot Impact — HakiMtaani" },
      {
        name: "description",
        content:
          "Live pilot metrics for HakiMtaani: legal questions answered, contracts checked, unfair clauses flagged and referrals to Kenyan legal aid.",
      },
      { property: "og:title", content: "Pilot Impact — HakiMtaani" },
      {
        property: "og:description",
        content:
          "Live pilot metrics: questions answered, contracts checked, clauses flagged and legal-aid referrals in Kenya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Pilot Impact — HakiMtaani" },
      {
        name: "twitter:description",
        content:
          "Live pilot metrics: questions answered, contracts checked, clauses flagged and legal-aid referrals in Kenya.",
      },
    ],
  }),
});

function Impact() {
  const fetchStats = useServerFn(getImpactStats);
  const { data, isLoading, error } = useQuery({
    queryKey: ["impact-stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 30000,
  });

  const maxDay = Math.max(1, ...(data?.last30Days.map((d) => d.count) ?? [1]));

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            Live pilot metrics
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Impact dashboard</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every question, contract check and legal-aid referral is counted anonymously — no names,
            no question text, no document content. These are the numbers behind the pitch.
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Button asChild variant="link" className="px-0">
              <Link to="/chat">
                <Scale className="mr-1 h-4 w-4" />
                Back to the assistant
              </Link>
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading metrics…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">
            Could not load metrics: {error instanceof Error ? error.message : "unknown error"}
          </p>
        ) : data ? (
          <>
            <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                icon={<MessageSquare className="h-4 w-4 text-primary" />}
                label="Questions answered"
                value={data.questions}
              />
              <Stat
                icon={<FileSearch className="h-4 w-4 text-primary" />}
                label="Contracts checked"
                value={data.contracts}
              />
              <Stat
                icon={<ShieldAlert className="h-4 w-4 text-primary" />}
                label="Unfair clauses flagged"
                value={data.clausesFlagged}
              />
              <Stat
                icon={<LifeBuoy className="h-4 w-4 text-primary" />}
                label="Legal-aid referrals"
                value={data.referrals}
              />
            </section>

            <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                icon={<Star className="h-4 w-4 text-primary" />}
                label="Feedback responses"
                value={data.feedbackCount}
              />
              <Stat
                icon={<ThumbsUp className="h-4 w-4 text-primary" />}
                label="Helpful votes"
                value={data.thumbsUp}
              />
              <Stat
                icon={<ThumbsDown className="h-4 w-4 text-primary" />}
                label="Not helpful votes"
                value={data.thumbsDown}
              />
              <Stat
                icon={<Star className="h-4 w-4 text-primary" />}
                label="Average rating"
                value={data.avgRating ?? 0}
              />
            </section>

            <section className="mb-10 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Where the need is</CardTitle>
                  <CardDescription>Questions and contract checks by area of law</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.byTopic.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  ) : (
                    data.byTopic.map((t) => {
                      const max = Math.max(...data.byTopic.map((x) => x.count));
                      return (
                        <div key={t.topic}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span>{t.topic}</span>
                            <span className="text-muted-foreground">{t.count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${(t.count / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Escalations to humans</CardTitle>
                  <CardDescription>
                    Which legal aid providers users reached out to
                    {data.avgRiskScore !== null
                      ? ` · average contract risk score ${data.avgRiskScore}/100`
                      : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.topReferrals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No referrals yet.</p>
                  ) : (
                    data.topReferrals.map((r) => (
                      <div
                        key={r.target}
                        className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm"
                      >
                        <span>{r.target}</span>
                        <span className="font-semibold text-primary">{r.count}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="mb-12">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Activity, last 30 days</CardTitle>
                  <CardDescription>All logged events per day</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.last30Days.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  ) : (
                    <div className="flex h-32 items-end gap-1">
                      {data.last30Days.map((d) => (
                        <div
                          key={d.date}
                          title={`${d.date}: ${d.count}`}
                          className="flex-1 rounded-t bg-primary/70"
                          style={{ height: `${Math.max(6, (d.count / maxDay) * 100)}%` }}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        ) : null}

        <p className="pb-8 text-xs text-muted-foreground">
          Metrics are anonymous and aggregate. HakiMtaani stores no personal information, question
          text or uploaded document content.
        </p>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <p className="text-3xl font-extrabold tracking-tight">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
