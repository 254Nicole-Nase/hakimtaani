import { addDays, addMonths, addYears, daysBetween } from "./dates.ts";
import { finalize, kes } from "./employment.ts";
import type {
  CaseAssessment,
  Deadline,
  EntitlementLine,
  Finding,
  Route,
  TenancyFacts,
} from "./types.ts";

const SMALL_CLAIMS_LIMIT = 1_000_000;

export function assessTenancy(f: TenancyFacts, today: string): CaseAssessment {
  const missing: string[] = [];
  const lines: EntitlementLine[] = [];
  const findings: Finding[] = [];
  const deadlines: Deadline[] = [];
  const assumptions: string[] = [];
  const routes: Route[] = [];
  const evidence: string[] = [
    "Tenancy agreement or any written/WhatsApp message setting the rent",
    "Rent and deposit receipts, or M-Pesa statements showing payments",
  ];

  if (!f.issue) missing.push("issue");
  if (!f.premisesType) missing.push("premisesType");

  switch (f.issue) {
    case "deposit_withheld": {
      if (f.depositPaid == null || f.depositPaid <= 0) missing.push("depositPaid");
      if (!f.moveOutDate) missing.push("moveOutDate");
      const deposit = f.depositPaid ?? 0;
      const deductions = Math.max(0, f.depositDeductionsAccepted ?? 0);
      const owed = Math.max(0, deposit - deductions);
      if (owed > 0) {
        lines.push({
          id: "deposit",
          label: "Deposit to be refunded",
          labelSw: "Amana (deposit) inayostahili kurejeshwa",
          amount: owed,
          status: "owed",
          law: "loa_4",
          working:
            deductions > 0
              ? `${kes(deposit)} paid − ${kes(deductions)} deductions you accept`
              : `${kes(deposit)} paid, no deductions accepted`,
          note: "A landlord may only deduct for unpaid rent or damage beyond normal wear and tear, and should show receipts.",
        });
      }
      if (owed > 0 && owed <= SMALL_CLAIMS_LIMIT) {
        routes.push({
          id: "small_claims",
          name: "Small Claims Court",
          why: "File the deposit claim yourself — no advocate needed, and cases are meant to be decided within 60 days.",
          cost: "Low filing fee",
        });
      }
      if (f.moveOutDate) {
        deadlines.push({
          id: "contract_claim",
          label: "Last day to sue for the deposit",
          labelSw: "Siku ya mwisho kudai amana mahakamani",
          date: addYears(f.moveOutDate, 6),
          law: "loa_4",
        });
      }
      evidence.push(
        "Photos or video of the house when you moved out",
        "Your move-out notice and any messages asking for the deposit",
      );
      break;
    }

    case "lockout_or_eviction": {
      if (f.courtOrderShown !== true) {
        findings.push({
          id: "self_help_eviction",
          severity: "violation",
          title: "Eviction without a court order",
          titleSw: "Kufukuzwa bila amri ya mahakama",
          detail:
            "Locking you out, removing doors or roofs, or cutting water and power to force you out without a court order is unlawful self-help eviction.",
          law: f.premisesType === "business" ? "cap301_12" : "const_40_43",
        });
        const urgentBy = f.incidentDate ? addDays(f.incidentDate, 1) : today;
        deadlines.push({
          id: "report_now",
          label: "Report to police (get an OB number) and call legal aid",
          labelSw: "Ripoti polisi (pata nambari ya OB) na piga simu msaada wa kisheria",
          date: urgentBy,
          law: "const_40_43",
          urgent: true,
        });
      } else {
        findings.push({
          id: "court_order",
          severity: "info",
          title: "Check the court order",
          titleSw: "Hakiki amri ya mahakama",
          detail:
            "Ask for a copy of the order and confirm it names you and the premises. A legal aid clinic can check whether it was properly obtained and served.",
          law: "const_40_43",
        });
      }
      routes.push(
        f.premisesType === "business"
          ? {
              id: "bprt",
              name: "Business Premises Rent Tribunal",
              why: "Can order you reinstated and award compensation for unlawful eviction from business premises.",
              cost: "Low filing fee",
            }
          : {
              id: "court_injunction",
              name: "Magistrates' Court (urgent injunction)",
              why: "A court can order the landlord to let you back in. Legal aid can help you file the same day.",
              cost: "Filing fees apply; legal aid may cover",
            },
      );
      evidence.push(
        "Photos or video of the lock-out, removed doors, or disconnected utilities",
        "Police OB number",
        "Witness names and numbers (neighbours, caretaker)",
      );
      break;
    }

    case "rent_increase_or_termination_notice": {
      if (f.premisesType === "business") {
        if (!f.noticeReceivedDate) missing.push("noticeReceivedDate");
        if (f.noticeReceivedDate && f.noticeEffectiveDate) {
          const period = daysBetween(f.noticeReceivedDate, f.noticeEffectiveDate);
          const twoMonths = daysBetween(f.noticeReceivedDate, addMonths(f.noticeReceivedDate, 2));
          if (period < twoMonths) {
            findings.push({
              id: "short_notice",
              severity: "violation",
              title: "Notice is shorter than two months",
              titleSw: "Notisi ni fupi kuliko miezi miwili",
              detail: `The notice gives ${period} days; the law requires at least two months before any rent increase or termination takes effect.`,
              law: "cap301_4",
            });
          }
        }
        if (f.noticeOnFormA === false || f.noticeInWriting === false) {
          findings.push({
            id: "not_form_a",
            severity: "violation",
            title: "Notice is not in the prescribed form",
            titleSw: "Notisi haiko katika fomu iliyoidhinishwa",
            detail:
              "For a controlled business tenancy, rent increases and terminations must be served on the prescribed Form A. A verbal notice or ordinary letter does not take effect.",
            law: "cap301_4",
          });
        }
        if (f.noticeReceivedDate) {
          const objectBy = addMonths(f.noticeReceivedDate, 1);
          deadlines.push({
            id: "object_form_a",
            label: "Last day to object in writing to the landlord",
            labelSw: "Siku ya mwisho kupinga notisi kwa maandishi",
            date: objectBy,
            law: "cap301_4",
            urgent: daysBetween(today, objectBy) <= 21,
          });
        }
        routes.push({
          id: "bprt",
          name: "Business Premises Rent Tribunal",
          why: "Once you object, the increase or termination cannot take effect unless the Tribunal approves it.",
          cost: "Low filing fee",
        });
        assumptions.push(
          "Assumes a controlled tenancy: an unwritten lease, one for five years or less, or one the landlord can end within five years for reasons other than breach.",
        );
      } else {
        findings.push({
          id: "residential_increase",
          severity: "info",
          title: "Your lease sets the rules for rent increases",
          titleSw: "Mkataba wako wa upangaji ndio unaoamua nyongeza ya kodi",
          detail:
            "For most residential tenancies, rent can only change as your agreement allows, with reasonable written notice. Very low-rent homes may fall under the Rent Restriction Tribunal. Keep paying the current rent and respond in writing.",
          law: "const_40_43",
        });
        if (f.noticeInWriting === false) {
          findings.push({
            id: "verbal_notice",
            severity: "warning",
            title: "Verbal notice only",
            titleSw: "Notisi ya mdomo tu",
            detail:
              "Ask the landlord to put the proposed change in writing. Without written notice, it is hard for them to enforce a new rent.",
            law: "const_40_43",
          });
        }
      }
      evidence.push("The landlord's notice (photo of both sides, envelope, or message screenshot)");
      break;
    }

    case "goods_seized": {
      findings.push({
        id: "unlawful_distress",
        severity: "warning",
        title: "Goods can only be seized through a licensed auctioneer",
        titleSw: "Mali inaweza kukamatwa tu kupitia dalali aliyesajiliwa",
        detail:
          "A landlord cannot take your goods personally or through a caretaker. Ask for the auctioneer's name, licence and the proclamation notice listing your goods. Seizure without these steps is unlawful.",
        law: "cap293",
      });
      routes.push({
        id: "court_injunction",
        name: "Magistrates' Court",
        why: "Can order return of goods seized unlawfully and award damages.",
        cost: "Filing fees apply; legal aid may cover",
      });
      evidence.push("List and photos of the goods taken, and any proclamation notice left behind");
      break;
    }
  }

  routes.push({
    id: "legal_aid",
    name: "Legal aid (Kituo cha Sheria, FIDA Kenya, NLAS)",
    why: "Free advice, demand letters and representation for tenants who cannot afford an advocate.",
    cost: "Free",
  });

  return finalize({
    track: "tenancy",
    missing: [...new Set(missing)],
    lines,
    findings,
    deadlines,
    routes,
    evidence,
    assumptions,
  });
}
