import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { isIsoDate } from "./case/dates";
import { checkStatement } from "./case/letter";
import type { EmploymentFacts, TenancyFacts } from "./case/types";

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model did not return JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

// Each field falls back to null rather than failing the whole extraction:
// anything the model gets wrong simply shows up as a question for the user.
const str = z.string().trim().min(1).nullable().catch(null);
const num = z.coerce.number().nonnegative().finite().nullable().catch(null);
const bool = z.boolean().nullable().catch(null);
const date = z
  .string()
  .nullable()
  .catch(null)
  .transform((v) => (v && isIsoDate(v) ? v : null));
const oneOf = <const T extends [string, ...string[]]>(values: T) =>
  z.enum(values).nullable().catch(null);

const EmploymentFactsSchema = z.object({
  employeeName: str,
  employerName: str,
  jobTitle: str,
  monthlyGrossSalary: num,
  payFrequency: oneOf(["monthly", "weekly", "daily"]),
  startDate: date,
  endDate: date,
  terminationReason: oneOf([
    "dismissed_no_reason",
    "misconduct",
    "poor_performance",
    "redundancy",
    "resigned",
    "contract_ended",
    "still_employed",
  ]),
  noticeDaysGiven: num,
  contractNoticeDays: num,
  hearingHeld: bool,
  leaveDaysTakenThisYear: num,
  unpaidSalaryMonths: num,
  nssfMember: bool,
  redundancyNoticeToLabourOfficer: bool,
  certificateOfServiceIssued: bool,
}) satisfies z.ZodType<EmploymentFacts, z.ZodTypeDef, unknown>;

const TenancyFactsSchema = z.object({
  tenantName: str,
  landlordName: str,
  premisesType: oneOf(["residential", "business"]),
  premisesLocation: str,
  issue: oneOf([
    "deposit_withheld",
    "lockout_or_eviction",
    "rent_increase_or_termination_notice",
    "goods_seized",
  ]),
  monthlyRent: num,
  depositPaid: num,
  depositDeductionsAccepted: num,
  moveOutDate: date,
  noticeReceivedDate: date,
  noticeEffectiveDate: date,
  noticeInWriting: bool,
  noticeOnFormA: bool,
  courtOrderShown: bool,
  incidentDate: date,
}) satisfies z.ZodType<TenancyFacts, z.ZodTypeDef, unknown>;

const ExtractInput = z.object({
  story: z.string().trim().min(20).max(6000),
  today: z.string().refine(isIsoDate),
});

export type ExtractedCase =
  | { track: "employment"; facts: EmploymentFacts; summary: string }
  | { track: "tenancy"; facts: TenancyFacts; summary: string }
  | { track: "unsupported"; summary: string };

export const extractCaseFacts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ExtractInput.parse(input))
  .handler(async ({ data }): Promise<ExtractedCase> => {
    const { getAiProvider } = await import("./ai-provider.server");
    const { provider, model } = getAiProvider();

    const { text } = await generateText({
      model: provider(model) as never,
      temperature: 0,
      system: `You extract structured facts from a Kenyan worker's or tenant's own account of a dispute. The account may be in English, Kiswahili, Sheng, or a mix.

Today's date is ${data.today}. Resolve relative dates ("last Friday", "mwezi uliopita", "since 2021") to ISO dates (YYYY-MM-DD). If only a month and year are given, use the 1st of that month.

Rules:
- Only record what the person actually said or clearly implied. Use null for anything unknown. Never guess amounts.
- Amounts are in Kenyan shillings; "30k" means 30000.
- track: "employment" for job, wages, dismissal; "tenancy" for rent, deposit, landlord, eviction; "unsupported" otherwise.
- terminationReason: "dismissed_no_reason" when fired without a reason or told "don't come back"; "misconduct" when accused of theft, lateness, insubordination etc.; "poor_performance"; "redundancy" when the job was cut or the business downsized; "resigned"; "contract_ended" for a fixed term that expired; "still_employed".
- hearingHeld: true only if they were called to a disciplinary meeting and allowed to respond; false if dismissed on the spot or with no chance to explain.
- noticeDaysGiven: 0 if dismissed with immediate effect.
- summary: one neutral sentence in English describing the dispute.

Return ONLY JSON:
{"track":"employment"|"tenancy"|"unsupported","summary":string,
 "employment":{"employeeName","employerName","jobTitle","monthlyGrossSalary","payFrequency":"monthly"|"weekly"|"daily","startDate","endDate","terminationReason","noticeDaysGiven","contractNoticeDays","hearingHeld","leaveDaysTakenThisYear","unpaidSalaryMonths","nssfMember","redundancyNoticeToLabourOfficer","certificateOfServiceIssued"} | null,
 "tenancy":{"tenantName","landlordName","premisesType":"residential"|"business","premisesLocation","issue":"deposit_withheld"|"lockout_or_eviction"|"rent_increase_or_termination_notice"|"goods_seized","monthlyRent","depositPaid","depositDeductionsAccepted","moveOutDate","noticeReceivedDate","noticeEffectiveDate","noticeInWriting","noticeOnFormA","courtOrderShown","incidentDate"} | null}`,
      prompt: `Account:\n"""\n${data.story}\n"""`,
    });

    const raw = z
      .object({
        track: z.enum(["employment", "tenancy", "unsupported"]).catch("unsupported"),
        summary: z.string().catch(""),
        employment: z.unknown().optional(),
        tenancy: z.unknown().optional(),
      })
      .parse(extractJson(text));

    if (raw.track === "employment") {
      return {
        track: "employment",
        summary: raw.summary,
        facts: EmploymentFactsSchema.parse(raw.employment ?? {}),
      };
    }
    if (raw.track === "tenancy") {
      return {
        track: "tenancy",
        summary: raw.summary,
        facts: TenancyFactsSchema.parse(raw.tenancy ?? {}),
      };
    }
    return { track: "unsupported", summary: raw.summary };
  });

const StatementInput = z.object({
  story: z.string().trim().min(20).max(6000),
  track: z.enum(["employment", "tenancy"]),
  language: z.enum(["en", "sw"]),
});

export const draftStatement = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => StatementInput.parse(input))
  .handler(async ({ data }): Promise<{ statement: string | null }> => {
    const { getAiProvider } = await import("./ai-provider.server");
    const { provider, model } = getAiProvider();
    const addressee = data.track === "employment" ? "employer" : "landlord";

    // The rules engine owns every amount and citation in the letter. The model
    // only restates what happened; anything that strays is rejected.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { text } = await generateText({
        model: provider(model) as never,
        temperature: 0.2,
        system: `You write the "what happened" paragraph of a formal demand letter from a Kenyan ${data.track === "employment" ? "worker" : "tenant"} to their ${addressee}.

Rules:
- First person, formal, factual, 2–4 sentences, addressed to the ${addressee} ("you").
- Only facts from the account. No opinions, threats, or emotional language.
- Do NOT mention any money amounts, numbers of shillings, laws, sections, acts, or rights — those are added separately.
- Dates are fine.
- Write in ${data.language === "sw" ? "formal Kiswahili" : "plain formal English"}.
- Return only the paragraph.`,
        prompt: `Account:\n"""\n${data.story}\n"""`,
      });
      const statement = text.trim().replace(/^["']|["']$/g, "");
      if (statement && checkStatement(statement).length === 0) return { statement };
    }
    return { statement: null };
  });
