import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Scale,
  Home,
  Briefcase,
  ShoppingCart,
  MessageSquare,
  ScanLine,
  FileSearch,
  Gavel,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "HakiMtaani — Know Your Rights, Kenya" },
      {
        name: "description",
        content:
          "HakiMtaani is an AI-powered legal information assistant for Kenyan tenants, workers, and consumers. Ask plain-language questions about your rights.",
      },
      { property: "og:title", content: "HakiMtaani — Know Your Rights, Kenya" },
      {
        property: "og:description",
        content:
          "Ask HakiMtaani about tenancy, employment, and consumer rights in Kenya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "HakiMtaani — Know Your Rights, Kenya" },
      {
        name: "twitter:description",
        content:
          "AI-powered legal information assistant for Kenyan tenants, workers, and consumers.",
      },
    ],
  }),
});

const topics = [
  {
    key: "tenancy",
    title: "Rent & Tenancy",
    icon: Home,
    description: "Rent increases, eviction rules, deposits, and repairs.",
  },
  {
    key: "employment",
    title: "Work & Employment",
    icon: Briefcase,
    description: "Contracts, payslips, termination, and worker rights.",
  },
  {
    key: "consumer",
    title: "Consumer Rights",
    icon: ShoppingCart,
    description: "Refunds, defective goods, and fair service terms.",
  },
];

function Index() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <section className="relative flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-transparent" />
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          HakiMtaani
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Know your rights. Ask HakiMtaani plain-language questions about Kenyan tenancy, employment,
          and consumer law.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link to="/case">
              <Gavel className="h-5 w-5" />
              Build my case
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link to="/chat">
              <MessageSquare className="h-5 w-5" />
              Ask a question
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/analyze">Check a contract</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/impact">See pilot impact</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          HakiMtaani provides general legal information, not professional legal advice.{" "}
          <Link to="/help" className="underline underline-offset-2 hover:text-foreground">
            Get human help
          </Link>
          .
        </p>
      </section>

      <section id="topics" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">What can you ask about?</h2>
            <p className="mt-2 text-muted-foreground">
              Start with one of these common areas. More topics and documents are added over time.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <Card key={topic.key} className="flex flex-col">
                <CardHeader>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <topic.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{topic.title}</CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <Button asChild variant="secondary" className="w-full">
                    <Link to="/chat" search={{ topic: topic.key }}>
                      Ask about {topic.title.toLowerCase()}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Scale className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">Why HakiMtaani?</h3>
          <p className="mt-2 text-muted-foreground">
            Many Kenyans cannot afford a lawyer for everyday disputes. HakiMtaani grounds AI answers
            in published legal sources so people can understand their rights before they escalate.
          </p>
        </div>
      </section>

      <section className="border-t px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 sm:p-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              <Gavel className="h-3.5 w-3.5 text-primary" />
              Case Builder
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              From "they fired me" to a demand letter in minutes
            </h3>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Tell your story in English, Kiswahili or Sheng — typed or spoken. HakiMtaani works out
              exactly what you are owed under Kenyan law, shows the deadlines you must not miss, and
              writes a cited letter to your employer or landlord. Every shilling is calculated by
              fixed legal rules, not guessed by AI.
            </p>
            <Button asChild size="lg" className="mt-6 gap-2">
              <Link to="/case">
                <Gavel className="h-5 w-5" />
                Build my case
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              <ScanLine className="h-3.5 w-3.5 text-primary" />
              Evidence engine
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              Contract Check — read the law into your lease
            </h3>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Upload a tenancy agreement or job contract. HakiMtaani quotes each clause that is
              illegal, risky, or unfair, cites the Kenyan statute it breaks, and tells you what to do
              next.
            </p>
            <Button asChild size="lg" className="mt-6 gap-2">
              <Link to="/analyze">
                <FileSearch className="h-5 w-5" />
                Check a contract
              </Link>
            </Button>
          </div>
        </div>
      </section>



      <footer className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} HakiMtaani. General information only — consult a legal
        professional for your specific situation.
      </footer>
    </main>
  );
}
