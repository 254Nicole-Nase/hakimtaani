# HakiMtaani

**Know your rights, and act on them.** HakiMtaani is an AI legal assistant for Kenyan tenants and workers who can't afford a lawyer. You describe your problem in English, Kiswahili or Sheng, typed or spoken. HakiMtaani tells you what the law says, what you are owed, the deadlines you must meet, and gives you a letter you can send today.

Built by **Team Justly.so** for the Microsoft Imagine Cup.

> HakiMtaani provides general legal information, not legal advice. For urgent or complex matters, contact a legal aid clinic.

## Features

| | What it does |
|---|---|
| **Build my case** (`/case`) | Tell your story. HakiMtaani extracts the facts, you confirm them, and it calculates what you are owed shilling by shilling: unpaid salary, leave, notice pay, service pay, severance, and the maximum compensation for unfair dismissal. It flags legal violations, shows your deadlines as real dates, and writes a demand letter or notice of objection in English or Kiswahili. |
| **Ask** (`/chat`) | Plain-language answers on tenancy, employment and consumer rights, cited to Kenyan statutes. Every legal reference is checked against the source text, and any that can't be matched are flagged. |
| **Contract Check** (`/analyze`) | Upload or paste a lease or employment contract. HakiMtaani quotes each illegal, risky or unfair clause, cites the provision it breaks, and marks whether that citation is verified. |
| **Voice** | Speak your question or story. It is transcribed with Azure Speech, or Gemini as a fallback. |
| **Get help** (`/help`) | Free and low-cost legal aid in Kenya: Kituo cha Sheria, FIDA Kenya, NLAS, LSK, law clinics and the Small Claims Court. |
| **Impact** (`/impact`) | Anonymous usage and feedback metrics for the pilot. |

## How it works: the AI handles language, code handles the law

Generic chatbots get legal numbers wrong with total confidence. HakiMtaani keeps the AI away from anything that must be exact:

- **AI:** understands the user's story, extracts facts, drafts plain-language explanations, and writes the "what happened" paragraph of a letter.
- **Rules engine (`src/lib/case/`):** tested TypeScript that computes every amount, finding and deadline from the facts. Each one is tied to a specific provision, such as Employment Act 2007 s.28, s.35, s.40, s.47, s.49 and s.90, Cap 301 s.4, and the Constitution Arts. 40 and 43.
- **Letter guard:** AI-drafted text that mentions money or cites law is rejected, so every figure and citation in a letter comes from the rules engine.
- **Citation checker (`src/lib/citations.ts`):** parses statute references in English and Kiswahili (e.g. "section 41 of the Employment Act", "Cap 301, s.4(2)", "kifungu cha 41") and confirms each one against the source passages.

Details and the full rule table are in [docs/CASE_BUILDER.md](docs/CASE_BUILDER.md).

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React, Vite, Nitro), TypeScript, Tailwind CSS, shadcn/ui
- Supabase (Postgres) for the legal library, usage events and feedback
- AI: **Azure OpenAI**, **Azure AI Document Intelligence** and **Azure Speech**, with Google Gemini and the Lovable AI Gateway as fallbacks
- Deployed on Vercel. Also editable and hostable in [Lovable](https://lovable.dev), which stays in sync with this repo.

## Run locally

Requires Node.js 22+ (or bun).

```sh
git clone https://github.com/254Nicole-Nase/hakimtaani.git
cd hakimtaani
npm install
cp .env.example .env   # fill in Supabase and one AI provider
npm run dev
```

The AI provider is chosen from whichever keys are set, in this order: **Azure OpenAI → Google Gemini (`GOOGLE_API_KEY`) → Lovable AI Gateway**. See [.env.example](.env.example).

## Scripts

| Command | |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run the unit tests (rules engine, letters, citation checker) |
| `npm run build` | Production build (Cloudflare target, used by Lovable) |
| `npm run build:vercel` | Production build for Vercel |
| `npm run lint` | ESLint + Prettier |

## Deployment

- **Vercel:** every push to `main` deploys to production, and every pull request gets a preview URL. Setup and environment variables are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- **Lovable:** open the project in the Lovable editor and click **Publish**.
- **CI:** GitHub Actions runs typecheck, tests and a Vercel build on every push and pull request.

## Project structure

```
src/
  routes/              pages: index, case, chat, analyze, help, impact
  components/case/     Case Builder UI (facts form, results, letter)
  lib/case/            rules engine: law registry, employment, tenancy, dates, letters (+ tests)
  lib/citations.ts     citation parser and verifier (+ tests)
  lib/*.functions.ts   server functions: chat, contract check, case extraction, voice, metrics
  lib/*.server.ts      AI provider selection and Azure integrations
supabase/migrations/   database schema and the Kenyan legal library
docs/                  Case Builder design and deployment guide
```

## Contributing

Work on a branch and open a pull request against `main`. `main` syncs to Lovable, so keep it deployable. Run `npm test` and `npx tsc --noEmit` before pushing.

Changes to the legal rules in `src/lib/case/` should cite the provision they implement and come with a test.
