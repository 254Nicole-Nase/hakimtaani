/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addMonths, completedMonths } from "./dates.ts";
import { assessEmployment } from "./employment.ts";
import { buildLetter, checkStatement } from "./letter.ts";
import { assessTenancy } from "./tenancy.ts";
import type { EmploymentFacts, TenancyFacts } from "./types.ts";

const baseEmployment: EmploymentFacts = {
  employeeName: "Mary Wanjiku",
  employerName: "Sunrise Supermarket Ltd",
  jobTitle: "Cashier",
  monthlyGrossSalary: 30_000,
  payFrequency: "monthly",
  startDate: "2021-03-01",
  endDate: "2025-09-26",
  terminationReason: "dismissed_no_reason",
  noticeDaysGiven: 0,
  contractNoticeDays: null,
  hearingHeld: false,
  leaveDaysTakenThisYear: 0,
  unpaidSalaryMonths: 0,
  nssfMember: false,
  redundancyNoticeToLabourOfficer: null,
  certificateOfServiceIssued: false,
};

const baseTenancy: TenancyFacts = {
  tenantName: "Otieno",
  landlordName: "Kamau",
  premisesType: "residential",
  premisesLocation: "Umoja, Nairobi",
  issue: "deposit_withheld",
  monthlyRent: 12_000,
  depositPaid: 12_000,
  depositDeductionsAccepted: 2_000,
  moveOutDate: "2025-08-31",
  noticeReceivedDate: null,
  noticeEffectiveDate: null,
  noticeInWriting: null,
  noticeOnFormA: null,
  courtOrderShown: null,
  incidentDate: null,
};

const byId = (lines: { id: string; amount: number }[], id: string) =>
  lines.find((l) => l.id === id)?.amount;

describe("dates", () => {
  it("clamps month-end additions", () => {
    assert.equal(addMonths("2025-01-31", 1), "2025-02-28");
    assert.equal(addMonths("2024-01-31", 1), "2024-02-29");
  });
  it("counts the last worked day as worked", () => {
    assert.equal(completedMonths("2025-01-01", "2025-12-31"), 12);
    assert.equal(completedMonths("2025-01-01", "2025-12-30"), 11);
    assert.equal(completedMonths("2025-01-15", "2025-01-10"), 0);
  });
});

describe("employment", () => {
  it("computes Mary's terminal dues for a dismissal without reason", () => {
    const a = assessEmployment(baseEmployment, "2025-09-29");
    assert.deepEqual(a.missing, []);
    // 54 completed months → 4 years, 6 months into the final leave year.
    assert.equal(byId(a.lines, "leave"), 10_500); // 6 × 1.75 days × 1,000
    assert.equal(byId(a.lines, "notice_pay"), 30_000);
    assert.equal(byId(a.lines, "service_pay"), 60_000); // 15 × 1,000 × 4
    assert.equal(byId(a.lines, "compensation"), 360_000);
    assert.equal(a.totalOwed, 100_500);
    assert.equal(a.maxDiscretionary, 360_000);
    assert.ok(a.findings.some((f) => f.id === "no_valid_reason"));
    assert.ok(a.findings.some((f) => f.id === "no_certificate"));
    const lo = a.deadlines.find((d) => d.id === "labour_officer");
    assert.equal(lo?.date, "2025-12-26");
    assert.equal(a.deadlines.find((d) => d.id === "elrc")?.date, "2028-09-26");
  });

  it("drops service pay for NSSF members", () => {
    const a = assessEmployment({ ...baseEmployment, nssfMember: true }, "2025-09-29");
    assert.equal(byId(a.lines, "service_pay"), undefined);
    assert.ok(a.findings.some((f) => f.id === "service_pay_nssf"));
  });

  it("marks service pay conditional when NSSF membership is unknown", () => {
    const a = assessEmployment({ ...baseEmployment, nssfMember: null }, "2025-09-29");
    assert.equal(a.lines.find((l) => l.id === "service_pay")?.status, "conditional");
    assert.equal(a.totalOwed, 40_500);
    assert.equal(a.totalConditional, 60_000);
  });

  it("pays severance, not service pay, on redundancy", () => {
    const a = assessEmployment(
      {
        ...baseEmployment,
        terminationReason: "redundancy",
        noticeDaysGiven: 30,
        redundancyNoticeToLabourOfficer: true,
      },
      "2025-09-29",
    );
    assert.equal(byId(a.lines, "severance"), 60_000);
    assert.equal(byId(a.lines, "service_pay"), undefined);
    assert.equal(byId(a.lines, "notice_pay"), undefined);
    assert.equal(byId(a.lines, "compensation"), undefined);
  });

  it("treats a redundancy without labour-officer notice as unfair", () => {
    const a = assessEmployment(
      {
        ...baseEmployment,
        terminationReason: "redundancy",
        noticeDaysGiven: 0,
        redundancyNoticeToLabourOfficer: false,
      },
      "2025-09-29",
    );
    assert.ok(a.findings.some((f) => f.id === "redundancy_procedure"));
    assert.equal(byId(a.lines, "compensation"), 360_000);
  });

  it("pays partial notice when some notice was given", () => {
    const a = assessEmployment({ ...baseEmployment, noticeDaysGiven: 14 }, "2025-09-29");
    assert.equal(byId(a.lines, "notice_pay"), 15_000);
  });

  it("gives no notice pay or compensation on resignation", () => {
    const a = assessEmployment({ ...baseEmployment, terminationReason: "resigned" }, "2025-09-29");
    assert.equal(byId(a.lines, "notice_pay"), undefined);
    assert.equal(byId(a.lines, "compensation"), undefined);
    assert.equal(
      a.deadlines.find((d) => d.id === "labour_officer"),
      undefined,
    );
  });

  it("makes notice pay conditional when a heard misconduct dismissal may be justified", () => {
    const a = assessEmployment(
      { ...baseEmployment, terminationReason: "misconduct", hearingHeld: true },
      "2025-09-29",
    );
    assert.equal(a.lines.find((l) => l.id === "notice_pay")?.status, "conditional");
    assert.ok(a.findings.some((f) => f.id === "fairness_depends"));
  });

  it("gives no leave for under two months in the final leave year", () => {
    const a = assessEmployment({ ...baseEmployment, endDate: "2025-04-15" }, "2025-09-29");
    assert.equal(byId(a.lines, "leave"), undefined);
  });

  it("reports missing facts instead of guessing", () => {
    const a = assessEmployment(
      { ...baseEmployment, monthlyGrossSalary: null, endDate: null },
      "2025-09-29",
    );
    assert.ok(a.missing.includes("monthlyGrossSalary"));
    assert.ok(a.missing.includes("endDate"));
    assert.equal(a.lines.length, 0);
  });

  it("claims unpaid salary for a worker still in the job", () => {
    const a = assessEmployment(
      {
        ...baseEmployment,
        terminationReason: "still_employed",
        endDate: null,
        unpaidSalaryMonths: 2,
      },
      "2025-09-29",
    );
    assert.deepEqual(a.missing, []);
    assert.equal(byId(a.lines, "unpaid_salary"), 60_000);
    assert.ok(a.findings.some((f) => f.id === "continuing_arrears"));
  });
});

describe("tenancy", () => {
  it("computes the deposit refund and routes to Small Claims", () => {
    const a = assessTenancy(baseTenancy, "2025-09-29");
    assert.equal(a.totalOwed, 10_000);
    assert.ok(a.routes.some((r) => r.id === "small_claims"));
    assert.equal(a.deadlines[0]?.date, "2031-08-31");
  });

  it("flags self-help eviction as urgent", () => {
    const a = assessTenancy(
      {
        ...baseTenancy,
        issue: "lockout_or_eviction",
        courtOrderShown: false,
        incidentDate: "2025-09-28",
      },
      "2025-09-29",
    );
    assert.ok(a.findings.some((f) => f.id === "self_help_eviction" && f.severity === "violation"));
    assert.ok(a.deadlines.some((d) => d.urgent));
  });

  it("checks Form A notice period and objection deadline for business premises", () => {
    const a = assessTenancy(
      {
        ...baseTenancy,
        premisesType: "business",
        issue: "rent_increase_or_termination_notice",
        noticeReceivedDate: "2025-09-15",
        noticeEffectiveDate: "2025-10-01",
        noticeOnFormA: false,
      },
      "2025-09-29",
    );
    assert.ok(a.findings.some((f) => f.id === "short_notice"));
    assert.ok(a.findings.some((f) => f.id === "not_form_a"));
    const objection = a.deadlines.find((d) => d.id === "object_form_a");
    assert.equal(objection?.date, "2025-10-15");
    assert.equal(objection?.urgent, true);
  });
});

describe("letter", () => {
  it("builds an English demand letter with exact figures and citations", () => {
    const assessment = assessEmployment(baseEmployment, "2025-09-29");
    const letter = buildLetter({
      track: "employment",
      facts: baseEmployment,
      assessment,
      language: "en",
      today: "2025-09-29",
      statement: "On 26 September my manager told me not to come back.",
      includedLineIds: assessment.lines.map((l) => l.id),
    });
    assert.match(letter, /Total: KES 100,500/);
    assert.match(letter, /Employment Act 2007, s\.28\(1\)/);
    assert.match(letter, /twelve months' gross salary/);
    assert.match(letter, /certificate of service/);
    assert.doesNotMatch(letter, /KES 360,000/);
  });

  it("builds a Kiswahili letter", () => {
    const assessment = assessTenancy(baseTenancy, "2025-09-29");
    const letter = buildLetter({
      track: "tenancy",
      facts: baseTenancy,
      assessment,
      language: "sw",
      today: "2025-09-29",
      statement: null,
      includedLineIds: ["deposit"],
    });
    assert.match(letter, /MADAI YA KUREJESHEWA AMANA/);
    assert.match(letter, /KES 10,000/);
    assert.match(letter, /29 Septemba 2025/);
  });

  it("only claims the lines the user selected", () => {
    const assessment = assessEmployment(baseEmployment, "2025-09-29");
    const letter = buildLetter({
      track: "employment",
      facts: baseEmployment,
      assessment,
      language: "en",
      today: "2025-09-29",
      statement: null,
      includedLineIds: ["leave"],
    });
    assert.match(letter, /Total: KES 10,500/);
  });

  it("rejects AI statements that invent amounts or law", () => {
    assert.deepEqual(checkStatement("On 26 September 2025 my boss told me to leave."), []);
    assert.ok(checkStatement("They owe me KES 50,000.").length > 0);
    assert.ok(checkStatement("They owe me 50,000 for March.").length > 0);
    assert.ok(checkStatement("This breaks section 41 of the Employment Act.").length > 0);
  });
});

describe("letter grounds", () => {
  it("lists only termination grounds, in the employee's voice", () => {
    const assessment = assessEmployment(baseEmployment, "2025-09-29");
    const sw = buildLetter({
      track: "employment",
      facts: baseEmployment,
      assessment,
      language: "sw",
      today: "2025-09-29",
      statement: null,
      includedLineIds: [],
    });
    assert.match(sw, /Sikupewa sababu yoyote halali/);
    assert.doesNotMatch(sw, /- Hukupewa cheti/);
  });
});
