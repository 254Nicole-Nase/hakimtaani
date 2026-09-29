# Case Builder and citation verification

## What it does

A worker or tenant tells their story in English, Kiswahili or Sheng, typed or spoken. HakiMtaani returns:

1. **What they are owed**, in shillings, line by line, each tied to the provision that creates the entitlement.
2. **What went wrong legally**, such as dismissal without a hearing, eviction without a court order, or a rent notice not served on Form A.
3. **Their deadlines**, as calendar dates with days remaining. Example: 3 months to complain to a labour officer (Employment Act s.47(1)).
4. **A demand letter or notice of objection** in English or Kiswahili, ready to print or send on WhatsApp.
5. **Where to take it** and **what evidence to gather**.

## How it works: the AI handles language, code handles the law

```
story ──► AI: extract facts (JSON) ──► user checks and corrects facts
                                              │
                                              ▼
                              rules engine (pure TypeScript, tested)
                              amounts · findings · deadlines · routes
                                              │
                 AI: "what happened" paragraph ──► guard ──► letter template
```

- `src/lib/case/employment.ts` and `tenancy.ts` hold the legal rules as code. No AI is involved, so the same facts always produce the same numbers.
- `src/lib/case/law.ts` is the closed list of provisions the engine may cite. Every figure, finding and deadline points to an entry here.
- `src/lib/case/letter.ts` builds the letter from a template. The AI writes only the factual narrative paragraph, and `checkStatement` rejects any draft that mentions an amount or cites a law. Amounts and citations in the letter therefore always come from the rules engine.
- `src/lib/case.functions.ts` holds the two AI calls: fact extraction and narrative drafting.

## Citation verification

`src/lib/citations.ts` finds every statute reference in a generated answer and checks that the same act and section appear in the passages the model was given, or in the reviewed provisions in `law.ts`. It understands common English and Kiswahili forms, for example "section 41 of the Employment Act", "Cap 301, s.4(2)", "ss.43-45", "Article 43" and "kifungu cha 41".

- **Chat** shows "All N legal references checked against the source text" or lists the ones it could not match.
- **Contract Check** marks each clause's citation as verified or not verified. The prompt no longer asks the model to "rely on its wider knowledge".

This also provides the basis for an accuracy benchmark: run a set of known-answer questions and report the share of citations verified.

## Rules implemented

| Entitlement / check | Provision | Rule |
|---|---|---|
| Unpaid salary | EA s.18(4) | months unpaid × gross |
| Untaken leave (final leave year) | EA s.28(1) | 1.75 days per completed month (from 2 months on), minus days taken |
| Pay in lieu of notice | EA ss.35(1), 36; s.40(1) for redundancy | monthly-paid: one month; weekly: one week; the contract's notice if longer; reduced for notice actually given |
| Service pay | EA s.35(5)–(6) | 15 days per completed year; not owed to NSSF or pension members; conditional if membership unknown |
| Severance | EA s.40(1) | 15 days per completed year on redundancy |
| Unfair termination compensation | EA s.49(1)(c) | shown as "up to 12 months"; never added to the amount demanded |
| Procedural fairness | EA ss.41, 43, 45; s.40(1) | no reason given, no hearing, or redundancy without notice to the labour officer |
| Labour officer deadline | EA s.47(1) | 3 months from dismissal |
| Court deadline | EA s.90 | 3 years |
| Deposit refund | Limitation of Actions Act s.4(1); Small Claims Court Act | deposit minus deductions accepted; 6-year limit; routed to Small Claims if ≤ KES 1M |
| Self-help eviction | Constitution Arts. 40, 43; Cap 301 s.12 | lockout without a court order is flagged as urgent |
| Business rent notice | Cap 301 s.4 | Form A, at least 2 months' notice, objection within 1 month of receipt |
| Seizure of goods | Distress for Rent Act; Auctioneers Act | only through a licensed auctioneer |

A day's pay is monthly gross ÷ 30, the usual Employment and Labour Relations Court approach. The page shows every assumption to the user.

## Tests

```sh
npm test
```

- `src/lib/case/case.test.ts` covers the rules engine, including a worked example ("Mary", KES 100,500), dates and letters.
- `src/lib/citations.test.ts` covers the citation parser and verifier.

## Known limits / next steps

- **Overtime and minimum-wage underpayment** are not calculated yet. They need the current Regulation of Wages Order rates by county and occupation.
- **Unused leave carried over from earlier years** is not included. The user is told this.
- **Amounts owed are not logged.** Case Builder usage isn't written to the impact dashboard, because the `usage_events.event_type` check constraint only allows the existing event types. Adding a `case` type needs a migration.
- **The rules need a lawyer's review.** Have an advocate or law clinic check them before any pilot. The test file is designed to be read by one.
