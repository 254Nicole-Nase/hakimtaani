import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Phone, Globe, MapPin, MessageSquare, BarChart3 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { logReferral } from "@/lib/metrics.functions";

export const Route = createFileRoute("/help")({
  component: Help,
  head: () => ({
    meta: [
      { title: "Get Human Help — HakiMtaani" },
      {
        name: "description",
        content:
          "Free and low-cost legal aid in Kenya: Kituo cha Sheria, FIDA Kenya, LSK Legal Aid, university law clinics and Judiciary help desks.",
      },
      { property: "og:title", content: "Get Human Help — HakiMtaani" },
      {
        property: "og:description",
        content: "Directory of Kenyan legal aid clinics and hotlines for tenants, workers and consumers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Get Human Help — HakiMtaani" },
      {
        name: "twitter:description",
        content: "Directory of Kenyan legal aid clinics and hotlines for tenants, workers and consumers.",
      },
    ],
  }),
});

type Clinic = {
  name: string;
  focus: string;
  description: string;
  location: string;
  phone?: string;
  website?: string;
};

const clinics: Clinic[] = [
  {
    name: "Kituo cha Sheria",
    focus: "Tenancy & land",
    description:
      "Kenya's oldest legal aid NGO. Free advice clinics, forced-eviction response and community paralegals.",
    location: "Nairobi, Mombasa, Kisumu",
    phone: "+254 20 2451631",
    website: "https://kituochasheria.or.ke",
  },
  {
    name: "FIDA Kenya",
    focus: "Women's rights",
    description:
      "Free legal aid for women facing eviction, workplace discrimination, harassment or family disputes.",
    location: "Nairobi, Mombasa, Kisumu",
    phone: "+254 722 509 760",
    website: "https://fidakenya.org",
  },
  {
    name: "Law Society of Kenya — Legal Aid",
    focus: "General",
    description:
      "Pro bono referral scheme connecting qualifying Kenyans with advocates in good standing.",
    location: "Nationwide",
    website: "https://lsk.or.ke",
  },
  {
    name: "National Legal Aid Service (NLAS)",
    focus: "State legal aid",
    description:
      "Government body under the Legal Aid Act 2016 providing free legal services to indigent persons.",
    location: "Nationwide",
    website: "https://nlas.go.ke",
  },
  {
    name: "University law clinics",
    focus: "Contracts & advice",
    description:
      "Strathmore, UoN and Kabarak legal clinics review contracts and give supervised student-led advice at no cost.",
    location: "Nairobi, Nakuru",
  },
  {
    name: "Judiciary Small Claims Court",
    focus: "Claims under KES 1M",
    description:
      "File a claim yourself without an advocate. Fast-tracked hearings for deposits, refunds and unpaid debts. (Wage and dismissal claims go to a labour officer or the Employment and Labour Relations Court.)",
    location: "Court stations nationwide",
    website: "https://judiciary.go.ke",
  },
];

const escalate = [
  {
    title: "Unlawful eviction or lock-out in progress",
    action:
      "Call Kituo cha Sheria immediately and report to the nearest police station — self-help eviction without a court order is unlawful.",
  },
  {
    title: "Unpaid wages or unfair dismissal",
    action:
      "Complain to the nearest Labour Office within 3 months of a dismissal, or file at the Employment and Labour Relations Court within 3 years. Use Build my case to work out what you are owed.",
  },
  {
    title: "Deposit withheld or a refund refused",
    action:
      "Use the Small Claims Court for amounts under KES 1,000,000 — no advocate is required and filing fees are low.",
  },
];

function Help() {
  const track = useServerFn(logReferral);
  const onReferral = (target: string) => {
    void track({ data: { target } }).catch(() => undefined);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <LifeBuoy className="h-3.5 w-3.5 text-primary" />
            Human escalation
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Get human help</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            HakiMtaani explains the law. When a matter is urgent, contested, or heading to court, a
            human should take over. These Kenyan services are free or low-cost.
          </p>
          <Button asChild variant="link" className="mt-1 px-0">
            <Link to="/chat">
              <MessageSquare className="mr-1 h-4 w-4" />
              Back to the assistant
            </Link>
          </Button>
          <Button asChild variant="link" className="mt-1 px-0 sm:ml-4">
            <Link to="/impact">
              <BarChart3 className="mr-1 h-4 w-4" />
              Pilot impact
            </Link>
          </Button>
        </header>

        <section className="mb-12">
          <h2 className="mb-4 text-xl font-semibold">Legal aid providers</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {clinics.map((c) => (
              <Card key={c.name} className="flex flex-col">
                <CardHeader className="pb-3">
                  <Badge variant="secondary" className="mb-2 w-fit">
                    {c.focus}
                  </Badge>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <CardDescription>{c.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-1.5 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {c.location}
                  </p>
                  {c.phone ? (
                    <a
                      className="flex items-center gap-2 hover:text-foreground"
                      href={`tel:${c.phone.replace(/\s/g, "")}`}
                      onClick={() => onReferral(c.name)}
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      {c.phone}
                    </a>
                  ) : null}
                  {c.website ? (
                    <a
                      className="flex items-center gap-2 hover:text-foreground"
                      href={c.website}
                      onClick={() => onReferral(c.name)}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <Globe className="h-4 w-4 shrink-0" />
                      {c.website.replace("https://", "")}
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-xl font-semibold">When to escalate right away</h2>
          <div className="space-y-3">
            {escalate.map((e) => (
              <Card key={e.title}>
                <CardContent className="p-4">
                  <p className="font-medium">{e.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{e.action}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <p className="pb-8 text-xs text-muted-foreground">
          Contact details are published by the organisations themselves and may change. HakiMtaani is
          not affiliated with them and provides general information only.
        </p>
      </div>
    </main>
  );
}
