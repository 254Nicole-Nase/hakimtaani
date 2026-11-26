import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, BookOpen, Calculator, FileText, Mic, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "HakiMtaani — Know where you stand" },
      { name: "description", content: "Understand your rights at work and at home in Kenya. Estimate entitlements, check contracts and prepare a letter." },
      { property: "og:title", content: "HakiMtaani — Know where you stand" },
      { property: "og:description", content: "Your rights. Your options. Your next move." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const situations = [
  { no: "01", title: "Something happened at work", description: "Unpaid wages, dismissal, leave or notice pay.", to: "/case" },
  { no: "02", title: "A problem with my landlord", description: "Deposits, eviction, rent or tenancy disputes.", to: "/case" },
  { no: "03", title: "I need to understand a contract", description: "Review a lease or employment agreement.", to: "/analyze" },
  { no: "04", title: "I have a legal question", description: "Ask about work, housing or consumer rights.", to: "/chat" },
] as const;

function PaperIllustration() {
  return (
    <svg viewBox="0 0 360 270" className="mx-auto w-full max-w-sm text-primary" aria-hidden="true">
      <rect x="90" y="30" width="198" height="217" rx="2" fill="var(--secondary)" stroke="currentColor" transform="rotate(9 189 138)" />
      <g transform="rotate(-6 175 132)">
        <rect x="62" y="18" width="215" height="224" rx="2" fill="var(--card)" stroke="currentColor" strokeWidth="1.5" />
        <path d="M83 44H256M83 55H256" stroke="currentColor" strokeOpacity=".6" />
        <text x="83" y="81" fill="currentColor" fontFamily="Georgia, serif" fontSize="23">Your rights.</text>
        <text x="84" y="99" fill="currentColor" fontSize="10" letterSpacing="1.6">KNOW THE LAW</text>
        <path d="M84 121H250M84 133H229M84 157H250M84 169H209M84 192H175" stroke="currentColor" strokeOpacity=".4" strokeWidth="2" />
        <rect x="80" y="139" width="157" height="12" fill="var(--accent)" />
        <path d="M84 145H230" stroke="currentColor" strokeWidth="2" />
        <circle cx="227" cy="202" r="24" fill="none" stroke="var(--clay)" strokeWidth="2" />
        <path d="m215 202 8 8 15-17" fill="none" stroke="var(--clay)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function Index() {
  return (
    <main id="main-content" tabIndex={-1} className="bg-background text-foreground">
      <section className="mx-auto grid max-w-6xl items-center gap-4 px-5 py-12 sm:px-8 sm:py-20 md:grid-cols-[1.4fr_1fr] md:gap-12">
        <div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-clay">Everyday justice · Kenya</p>
          <h1 className="max-w-xl text-5xl leading-[1.04] tracking-tight text-primary sm:text-7xl">Know where<br />you stand.</h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">Understand your rights at work and at home. Find out what you may be owed, what deadlines apply, and what you can do next.</p>
          <Link to="/case" className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90">
            Tell us what happened <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground"><Mic className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Type or speak in English, Kiswahili or Sheng.</p>
        </div>
        <div className="hidden md:block"><PaperIllustration /></div>
      </section>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <h2 className="mb-5 text-2xl sm:text-3xl">Start with your situation.</h2>
          <div className="grid md:grid-cols-2 md:gap-x-10">
            {situations.map((item) => (
              <Link key={item.no} to={item.to} className="group flex min-h-24 items-center gap-4 border-t border-current/25 py-5 hover:bg-primary-foreground/5 focus-visible:outline-primary-foreground">
                <span className="text-sm opacity-75">{item.no}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{item.title}</span>
                  <span className="mt-1 block text-sm opacity-85">{item.description}</span>
                </span>
                <ArrowUpRight className="size-5 shrink-0 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">How HakiMtaani works</p>
        <h2 className="mt-3 max-w-2xl text-4xl leading-tight text-primary sm:text-5xl">Not guesswork. The law.</h2>
        <div className="mt-8 grid gap-7 sm:grid-cols-3">
          {[
            { icon: BookOpen, title: "Understand", body: "Tell your story in your own words. Confirm the facts before we assess your case." },
            { icon: Calculator, title: "Check", body: "Fixed legal rules calculate estimated amounts and deadlines. Legal references show the basis for the findings." },
            { icon: FileText, title: "Act", body: "Prepare a letter in English or Kiswahili, or find human legal assistance when you need it." },
          ].map((item, i) => (
            <div key={item.title} className="border-t border-border pt-5">
              <div className="flex items-center justify-between text-primary"><item.icon className="size-6" aria-hidden="true" /><span className="text-xs text-muted-foreground">0{i + 1}</span></div>
              <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="border-y border-border bg-secondary">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex gap-3"><ShieldCheck className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" /><div><h2 className="text-2xl text-primary">You don't have to do it alone.</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">For urgent, complex or contested matters, seek help from a qualified legal professional.</p></div></div>
          <Link to="/help" className="inline-flex min-h-11 shrink-0 items-center gap-2 font-semibold text-primary underline underline-offset-4">Find legal assistance <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </section>
      <footer className="mx-auto max-w-6xl px-5 py-8 text-sm text-muted-foreground sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4"><span className="font-editorial text-xl font-bold text-primary">HakiMtaani.</span><Link to="/impact" className="underline underline-offset-4">Pilot impact</Link></div>
        <p className="mt-4 max-w-2xl">General legal information, not professional legal advice. Avoid sharing unnecessary personal information, such as ID numbers or bank details.</p>
        <p className="mt-3">HakiMtaani · Team Justly.so</p>
      </footer>
    </main>
  );
}
