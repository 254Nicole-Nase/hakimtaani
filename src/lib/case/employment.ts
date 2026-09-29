import { addMonths, addYears, completedMonths, daysBetween } from "./dates.ts";
import type {
  CaseAssessment,
  Deadline,
  EmploymentFacts,
  EntitlementLine,
  Finding,
  Route,
} from "./types.ts";

/** ELRC practice: a "day's pay" is the gross monthly wage divided by 30. */
const DAYS_PER_MONTH = 30;
const LEAVE_DAYS_PER_MONTH = 1.75;
const SEVERANCE_DAYS_PER_YEAR = 15;
const SERVICE_PAY_DAYS_PER_YEAR = 15;
const MAX_COMPENSATION_MONTHS = 12;

export function kes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

function round(n: number): number {
  return Math.round(n);
}

type Fairness = "unfair" | "depends" | "not_applicable";

function assessFairness(f: EmploymentFacts, findings: Finding[]): Fairness {
  switch (f.terminationReason) {
    case "dismissed_no_reason":
      findings.push({
        id: "no_valid_reason",
        severity: "violation",
        title: "Dismissed without a valid reason",
        titleSw: "Ulifutwa kazi bila sababu halali",
        detail:
          "Your employer must prove a valid and fair reason for ending your job. A dismissal with no reason given is unfair termination.",
        law: "ea_43_45",
      });
      return "unfair";
    case "misconduct":
    case "poor_performance":
      if (f.hearingHeld === false) {
        findings.push({
          id: "no_hearing",
          severity: "violation",
          title: "No hearing before dismissal",
          titleSw: "Hukupewa nafasi ya kusikilizwa kabla ya kufutwa kazi",
          detail:
            "Before dismissing for misconduct or poor performance, your employer had to explain the reason and hear your side with a colleague or union representative present. Skipping this makes the dismissal procedurally unfair even if the reason was real.",
          law: "ea_41",
        });
        return "unfair";
      }
      findings.push({
        id: "fairness_depends",
        severity: "info",
        title: "Fairness depends on the evidence",
        titleSw: "Uhalali unategemea ushahidi",
        detail:
          f.hearingHeld === true
            ? "You were heard before dismissal, so whether it was unfair turns on whether the reason was genuine and proven. Amounts that depend on this are marked as conditional."
            : "Were you told the reason and given a chance to respond, with a colleague present? If not, the dismissal is procedurally unfair.",
        law: "ea_41",
      });
      return "depends";
    case "redundancy":
      if (f.redundancyNoticeToLabourOfficer === false) {
        findings.push({
          id: "redundancy_procedure",
          severity: "violation",
          title: "Redundancy procedure not followed",
          titleSw: "Utaratibu wa kupunguza wafanyakazi haukufuatwa",
          detail:
            "A redundancy is only lawful if you (or your union) and the local labour officer were given one month's written notice of the reasons and extent. Without it the termination is unfair.",
          law: "ea_40_1",
        });
        return "unfair";
      }
      return "not_applicable";
    default:
      return "not_applicable";
  }
}

/** Notice the law or contract required, as a fraction of one month's pay, and the days required. */
function requiredNotice(f: EmploymentFacts): { days: number; monthsOfPay: number } | null {
  const contract = f.contractNoticeDays ?? 0;
  if (f.terminationReason === "redundancy") {
    const days = Math.max(30, contract);
    return { days, monthsOfPay: Math.max(1, days / DAYS_PER_MONTH) };
  }
  switch (f.payFrequency ?? "monthly") {
    case "monthly": {
      const days = Math.max(28, contract);
      return { days, monthsOfPay: days <= 31 ? 1 : days / DAYS_PER_MONTH };
    }
    case "weekly": {
      const days = Math.max(7, contract);
      return { days, monthsOfPay: ((days / 7) * 12) / 52 };
    }
    case "daily":
      return contract > 0 ? { days: contract, monthsOfPay: contract / DAYS_PER_MONTH } : null;
  }
}

export function assessEmployment(f: EmploymentFacts, today: string): CaseAssessment {
  const missing: string[] = [];
  const lines: EntitlementLine[] = [];
  const findings: Finding[] = [];
  const deadlines: Deadline[] = [];
  const assumptions: string[] = [
    `A day's pay is taken as monthly gross ÷ ${DAYS_PER_MONTH}, the usual Employment and Labour Relations Court approach.`,
  ];

  if (f.monthlyGrossSalary == null || f.monthlyGrossSalary <= 0) missing.push("monthlyGrossSalary");
  if (!f.terminationReason) missing.push("terminationReason");
  if (!f.startDate) missing.push("startDate");
  const stillEmployed = f.terminationReason === "still_employed";
  if (!stillEmployed && !f.endDate) missing.push("endDate");

  const salary = f.monthlyGrossSalary ?? 0;
  const dailyRate = salary / DAYS_PER_MONTH;

  // Unpaid salary can be computed from salary alone.
  if (salary > 0 && f.unpaidSalaryMonths && f.unpaidSalaryMonths > 0) {
    lines.push({
      id: "unpaid_salary",
      label: "Unpaid salary",
      labelSw: "Mshahara ambao haujalipwa",
      amount: round(salary * f.unpaidSalaryMonths),
      status: "owed",
      law: "ea_18_4",
      working: `${f.unpaidSalaryMonths} month(s) × ${kes(salary)}`,
    });
  }

  const fairness = assessFairness(f, findings);
  const canComputeService =
    salary > 0 && !!f.startDate && !!f.terminationReason && !stillEmployed && !!f.endDate;

  if (canComputeService && f.startDate && f.endDate) {
    if (daysBetween(f.startDate, f.endDate) < 0) {
      missing.push("endDate");
    } else {
      const months = completedMonths(f.startDate, f.endDate);
      const years = Math.floor(months / 12);
      const reason = f.terminationReason;

      // Accrued leave for the final, incomplete leave year (s.28(1)(b)).
      const monthsInLeaveYear = months - years * 12;
      const accrued = monthsInLeaveYear >= 2 ? monthsInLeaveYear * LEAVE_DAYS_PER_MONTH : 0;
      const taken = f.leaveDaysTakenThisYear ?? 0;
      if (f.leaveDaysTakenThisYear == null) {
        assumptions.push(
          "Assumes no leave was taken in your final leave year — reduce the leave line by any days you took.",
        );
      }
      const leaveDays = Math.max(0, accrued - taken);
      if (leaveDays > 0) {
        lines.push({
          id: "leave",
          label: "Untaken annual leave",
          labelSw: "Malipo ya likizo ambayo haikuchukuliwa",
          amount: round(leaveDays * dailyRate),
          status: "owed",
          law: "ea_28_1",
          working: `${monthsInLeaveYear} month(s) × ${LEAVE_DAYS_PER_MONTH} days − ${taken} taken = ${leaveDays.toFixed(2)} days × ${kes(dailyRate)}`,
        });
      }
      assumptions.push(
        "Unused leave carried over from earlier leave years is not included; add it if your employer allowed carry-over.",
      );

      // Notice pay (ss.35–36; s.40(1)(f) for redundancy).
      const dismissed =
        reason === "dismissed_no_reason" ||
        reason === "misconduct" ||
        reason === "poor_performance" ||
        reason === "redundancy";
      const notice = dismissed ? requiredNotice(f) : null;
      if (notice) {
        if (f.noticeDaysGiven == null) missing.push("noticeDaysGiven");
        const given = Math.max(0, f.noticeDaysGiven ?? 0);
        const shortfall = Math.max(0, notice.days - given) / notice.days;
        if (f.noticeDaysGiven != null && shortfall > 0) {
          lines.push({
            id: "notice_pay",
            label: "Pay in lieu of notice",
            labelSw: "Mshahara badala ya notisi",
            amount: round(salary * notice.monthsOfPay * shortfall),
            status: fairness === "depends" ? "conditional" : "owed",
            law: reason === "redundancy" ? "ea_40_1" : "ea_36",
            working: `${notice.days} days required, ${given} given → ${(notice.monthsOfPay * shortfall).toFixed(2)} month(s) × ${kes(salary)}`,
            ...(fairness === "depends"
              ? {
                  note: "Owed unless the employer proves gross misconduct justifying summary dismissal.",
                }
              : {}),
          });
        }
      }

      // Severance for redundancy (s.40(1)(g)).
      if (reason === "redundancy" && years >= 1) {
        lines.push({
          id: "severance",
          label: "Severance pay",
          labelSw: "Malipo ya kuachishwa kazi (severance)",
          amount: round(SEVERANCE_DAYS_PER_YEAR * dailyRate * years),
          status: "owed",
          law: "ea_40_1",
          working: `${SEVERANCE_DAYS_PER_YEAR} days × ${kes(dailyRate)} × ${years} completed year(s)`,
        });
      }

      // Service pay (s.35(5)–(6)) for monthly-paid staff outside NSSF/pension schemes.
      const serviceEligibleReason =
        reason === "dismissed_no_reason" ||
        reason === "misconduct" ||
        reason === "poor_performance" ||
        reason === "resigned";
      if (serviceEligibleReason && (f.payFrequency ?? "monthly") === "monthly" && years >= 1) {
        if (f.nssfMember === true) {
          findings.push({
            id: "service_pay_nssf",
            severity: "info",
            title: "No service pay because you were in NSSF",
            titleSw: "Hustahili malipo ya huduma kwa sababu ulikuwa mwanachama wa NSSF",
            detail:
              "Service pay is replaced by NSSF or pension benefits. Check your NSSF statement to confirm your employer actually remitted your deductions.",
            law: "ea_35_5",
          });
        } else {
          lines.push({
            id: "service_pay",
            label: "Service pay",
            labelSw: "Malipo ya huduma (service pay)",
            amount: round(SERVICE_PAY_DAYS_PER_YEAR * dailyRate * years),
            status: f.nssfMember === false && fairness !== "depends" ? "owed" : "conditional",
            law: "ea_35_5",
            working: `${SERVICE_PAY_DAYS_PER_YEAR} days × ${kes(dailyRate)} × ${years} completed year(s)`,
            note:
              f.nssfMember == null
                ? "Only if you were not in NSSF, a registered pension/provident fund, or a better gratuity scheme."
                : "Only if you were also not in a registered pension/provident fund or better gratuity scheme.",
          });
        }
      }

      // Compensation for unfair termination (s.49(1)(c)).
      if (fairness === "unfair" || fairness === "depends") {
        lines.push({
          id: "compensation",
          label: "Compensation for unfair termination (maximum)",
          labelSw: "Fidia kwa kufutwa kazi isivyo haki (kiwango cha juu)",
          amount: round(salary * MAX_COMPENSATION_MONTHS),
          status: "discretionary",
          law: "ea_49_1c",
          working: `up to ${MAX_COMPENSATION_MONTHS} months × ${kes(salary)}`,
          note: "The court or labour officer decides the number of months based on length of service, conduct and loss suffered.",
        });
      }

      if (f.certificateOfServiceIssued === false) {
        findings.push({
          id: "no_certificate",
          severity: "violation",
          title: "No certificate of service",
          titleSw: "Hukupewa cheti cha utumishi",
          detail: "Your employer must give you a certificate of service when your job ends.",
          law: "ea_51",
        });
      }

      // Deadlines.
      if (dismissed) {
        const labourOfficer = addMonths(f.endDate, 3);
        deadlines.push({
          id: "labour_officer",
          label: "Last day to complain to a labour officer",
          labelSw: "Siku ya mwisho kulalamika kwa afisa wa kazi",
          date: labourOfficer,
          law: "ea_47_1",
          urgent: daysBetween(today, labourOfficer) <= 30,
        });
      }
      deadlines.push({
        id: "elrc",
        label: "Last day to file at the Employment and Labour Relations Court",
        labelSw: "Siku ya mwisho kufungua kesi katika Mahakama ya Ajira na Mahusiano ya Kazi",
        date: addYears(f.endDate, 3),
        law: "ea_90",
      });
    }
  }

  if (stillEmployed && (f.unpaidSalaryMonths ?? 0) > 0) {
    findings.push({
      id: "continuing_arrears",
      severity: "warning",
      title: "Each unpaid month has its own deadline",
      titleSw: "Kila mwezi ambao haujalipwa una muda wake wa mwisho",
      detail:
        "Claims must be filed within three years of each missed payment, or within twelve months after the non-payment stops. Keep records of every month.",
      law: "ea_90",
    });
  }

  const routes: Route[] = [
    {
      id: "labour_office",
      name: "County Labour Office",
      why: "A labour officer can summon your employer, mediate, and recommend payment. Start here — it is free and fast.",
      cost: "Free",
    },
    {
      id: "elrc",
      name: "Employment and Labour Relations Court",
      why: "Handles all employment disputes. You can file yourself without an advocate.",
      cost: "Court filing fees apply",
    },
    {
      id: "legal_aid",
      name: "Legal aid (NLAS, Kituo cha Sheria, FIDA Kenya)",
      why: "Free advice and representation if you cannot afford an advocate.",
      cost: "Free",
    },
  ];

  const evidence = [
    "Appointment letter or written contract (or any message offering you the job)",
    "Payslips or M-Pesa / bank statements showing your salary",
    "Termination letter, text or WhatsApp message ending your job",
    "NSSF statement (shows whether deductions were remitted)",
    "Names and numbers of colleagues who can confirm what happened",
  ];

  return finalize({
    track: "employment",
    missing: [...new Set(missing)],
    lines,
    findings,
    deadlines,
    routes,
    evidence,
    assumptions,
  });
}

export function finalize(
  a: Omit<CaseAssessment, "totalOwed" | "totalConditional" | "maxDiscretionary">,
): CaseAssessment {
  const sum = (status: EntitlementLine["status"]) =>
    a.lines.filter((l) => l.status === status).reduce((s, l) => s + l.amount, 0);
  return {
    ...a,
    deadlines: [...a.deadlines].sort((x, y) => x.date.localeCompare(y.date)),
    totalOwed: sum("owed"),
    totalConditional: sum("conditional"),
    maxDiscretionary: sum("discretionary"),
  };
}
