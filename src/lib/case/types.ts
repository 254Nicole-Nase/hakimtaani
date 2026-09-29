import type { LawId } from "./law.ts";

export type Track = "employment" | "tenancy";

export type TerminationReason =
  | "dismissed_no_reason"
  | "misconduct"
  | "poor_performance"
  | "redundancy"
  | "resigned"
  | "contract_ended"
  | "still_employed";

export type EmploymentFacts = {
  employeeName: string | null;
  employerName: string | null;
  jobTitle: string | null;
  /** Gross monthly pay in KES (for weekly/daily workers, their average monthly earnings). */
  monthlyGrossSalary: number | null;
  payFrequency: "monthly" | "weekly" | "daily" | null;
  startDate: string | null;
  /** Last day worked; null while still employed. */
  endDate: string | null;
  terminationReason: TerminationReason | null;
  /** Days of written notice actually given (0 if none). */
  noticeDaysGiven: number | null;
  /** Notice period in the contract, if longer than the statutory minimum. */
  contractNoticeDays: number | null;
  /** Was the employee told the reason and heard before dismissal (s.41)? */
  hearingHeld: boolean | null;
  /** Leave days already taken in the current (final) leave year. */
  leaveDaysTakenThisYear: number | null;
  /** Months of salary that were never paid. */
  unpaidSalaryMonths: number | null;
  nssfMember: boolean | null;
  /** For redundancy: was the labour officer notified a month ahead? */
  redundancyNoticeToLabourOfficer: boolean | null;
  certificateOfServiceIssued: boolean | null;
};

export type TenancyIssue =
  | "deposit_withheld"
  | "lockout_or_eviction"
  | "rent_increase_or_termination_notice"
  | "goods_seized";

export type TenancyFacts = {
  tenantName: string | null;
  landlordName: string | null;
  premisesType: "residential" | "business" | null;
  premisesLocation: string | null;
  issue: TenancyIssue | null;
  monthlyRent: number | null;
  depositPaid: number | null;
  /** Deductions the landlord claims, with any justification accepted by the tenant. */
  depositDeductionsAccepted: number | null;
  moveOutDate: string | null;
  /** When the landlord's notice (rent increase / termination) was received. */
  noticeReceivedDate: string | null;
  /** When the notice says the change takes effect. */
  noticeEffectiveDate: string | null;
  noticeInWriting: boolean | null;
  /** For business premises: was it the prescribed Form A? */
  noticeOnFormA: boolean | null;
  courtOrderShown: boolean | null;
  incidentDate: string | null;
};

export type LineStatus = "owed" | "conditional" | "discretionary";

export type EntitlementLine = {
  id: string;
  label: string;
  labelSw: string;
  amount: number;
  status: LineStatus;
  law: LawId;
  /** Human-readable working, e.g. "15 days × KES 1,000 × 4 years". */
  working: string;
  note?: string;
};

export type Deadline = {
  id: string;
  label: string;
  labelSw: string;
  date: string;
  law: LawId;
  urgent?: boolean;
};

export type Finding = {
  id: string;
  severity: "violation" | "warning" | "info";
  title: string;
  titleSw: string;
  detail: string;
  law: LawId;
};

export type Route = {
  id: string;
  name: string;
  why: string;
  cost: string;
};

export type CaseAssessment = {
  track: Track;
  /** Fields the calculation needed but didn't have; lines depending on them are omitted. */
  missing: string[];
  lines: EntitlementLine[];
  /** Sum of lines with status "owed". */
  totalOwed: number;
  /** Sum of "conditional" lines — owed only if the stated condition holds. */
  totalConditional: number;
  /** Maximum discretionary compensation a court/labour officer may add. */
  maxDiscretionary: number;
  findings: Finding[];
  deadlines: Deadline[];
  routes: Route[];
  evidence: string[];
  assumptions: string[];
};
