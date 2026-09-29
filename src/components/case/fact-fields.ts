import type { EmploymentFacts, TenancyFacts } from "@/lib/case/types";

type Option = { value: string; label: string };

export type FieldSpec<T> = {
  key: keyof T & string;
  label: string;
  hint?: string;
  kind: "text" | "money" | "number" | "date" | "select" | "yesno";
  options?: Option[];
  show?: (facts: T) => boolean;
};

export const EMPTY_EMPLOYMENT: EmploymentFacts = {
  employeeName: null,
  employerName: null,
  jobTitle: null,
  monthlyGrossSalary: null,
  payFrequency: null,
  startDate: null,
  endDate: null,
  terminationReason: null,
  noticeDaysGiven: null,
  contractNoticeDays: null,
  hearingHeld: null,
  leaveDaysTakenThisYear: null,
  unpaidSalaryMonths: null,
  nssfMember: null,
  redundancyNoticeToLabourOfficer: null,
  certificateOfServiceIssued: null,
};

export const EMPTY_TENANCY: TenancyFacts = {
  tenantName: null,
  landlordName: null,
  premisesType: null,
  premisesLocation: null,
  issue: null,
  monthlyRent: null,
  depositPaid: null,
  depositDeductionsAccepted: null,
  moveOutDate: null,
  noticeReceivedDate: null,
  noticeEffectiveDate: null,
  noticeInWriting: null,
  noticeOnFormA: null,
  courtOrderShown: null,
  incidentDate: null,
};

const ended = (f: EmploymentFacts) => f.terminationReason !== "still_employed";
const dismissed = (f: EmploymentFacts) =>
  f.terminationReason === "dismissed_no_reason" ||
  f.terminationReason === "misconduct" ||
  f.terminationReason === "poor_performance" ||
  f.terminationReason === "redundancy";

export const EMPLOYMENT_FIELDS: FieldSpec<EmploymentFacts>[] = [
  {
    key: "terminationReason",
    label: "What happened to your job?",
    kind: "select",
    options: [
      { value: "dismissed_no_reason", label: "Fired with no reason given" },
      { value: "misconduct", label: "Fired for alleged misconduct" },
      { value: "poor_performance", label: "Fired for poor performance" },
      { value: "redundancy", label: "Declared redundant / job cut" },
      { value: "resigned", label: "I resigned" },
      { value: "contract_ended", label: "Fixed-term contract ended" },
      { value: "still_employed", label: "Still employed (unpaid wages)" },
    ],
  },
  {
    key: "monthlyGrossSalary",
    label: "Gross monthly salary",
    hint: "Before deductions",
    kind: "money",
  },
  {
    key: "payFrequency",
    label: "How were you paid?",
    kind: "select",
    options: [
      { value: "monthly", label: "Monthly" },
      { value: "weekly", label: "Weekly" },
      { value: "daily", label: "Daily (casual)" },
    ],
  },
  { key: "startDate", label: "Start date", kind: "date" },
  { key: "endDate", label: "Last day worked", kind: "date", show: ended },
  {
    key: "noticeDaysGiven",
    label: "Days of written notice given",
    hint: "0 if told to leave immediately",
    kind: "number",
    show: dismissed,
  },
  {
    key: "hearingHeld",
    label: "Were you told the reason and allowed to respond before being fired?",
    kind: "yesno",
    show: (f) => f.terminationReason === "misconduct" || f.terminationReason === "poor_performance",
  },
  {
    key: "redundancyNoticeToLabourOfficer",
    label: "Were you and the labour officer given a month's written notice of the redundancy?",
    kind: "yesno",
    show: (f) => f.terminationReason === "redundancy",
  },
  {
    key: "nssfMember",
    label: "Were NSSF deductions made from your pay?",
    kind: "yesno",
    show: ended,
  },
  {
    key: "leaveDaysTakenThisYear",
    label: "Leave days taken since your last work anniversary",
    kind: "number",
    show: ended,
  },
  { key: "unpaidSalaryMonths", label: "Months of salary never paid", kind: "number" },
  {
    key: "certificateOfServiceIssued",
    label: "Did you get a certificate of service?",
    kind: "yesno",
    show: ended,
  },
  {
    key: "contractNoticeDays",
    label: "Notice period in your contract (days)",
    hint: "Leave blank if none or unsure",
    kind: "number",
    show: dismissed,
  },
  { key: "employeeName", label: "Your name", kind: "text" },
  { key: "employerName", label: "Employer's name", kind: "text" },
  { key: "jobTitle", label: "Job title", kind: "text" },
];

export const TENANCY_FIELDS: FieldSpec<TenancyFacts>[] = [
  {
    key: "issue",
    label: "What is the problem?",
    kind: "select",
    options: [
      { value: "deposit_withheld", label: "Deposit not returned" },
      { value: "lockout_or_eviction", label: "Locked out / being evicted" },
      { value: "rent_increase_or_termination_notice", label: "Rent increase or notice to leave" },
      { value: "goods_seized", label: "Landlord took my goods" },
    ],
  },
  {
    key: "premisesType",
    label: "Type of premises",
    kind: "select",
    options: [
      { value: "residential", label: "Home (residential)" },
      { value: "business", label: "Shop, hotel or eatery (business)" },
    ],
  },
  { key: "monthlyRent", label: "Monthly rent", kind: "money" },
  {
    key: "depositPaid",
    label: "Deposit paid",
    kind: "money",
    show: (f) => f.issue === "deposit_withheld",
  },
  {
    key: "depositDeductionsAccepted",
    label: "Deductions you accept (unpaid rent, real damage)",
    hint: "0 if none",
    kind: "money",
    show: (f) => f.issue === "deposit_withheld",
  },
  {
    key: "moveOutDate",
    label: "Date you moved out",
    kind: "date",
    show: (f) => f.issue === "deposit_withheld",
  },
  {
    key: "incidentDate",
    label: "Date it happened",
    kind: "date",
    show: (f) => f.issue === "lockout_or_eviction" || f.issue === "goods_seized",
  },
  {
    key: "courtOrderShown",
    label: "Were you shown a court order?",
    kind: "yesno",
    show: (f) => f.issue === "lockout_or_eviction",
  },
  {
    key: "noticeReceivedDate",
    label: "Date you received the notice",
    kind: "date",
    show: (f) => f.issue === "rent_increase_or_termination_notice",
  },
  {
    key: "noticeEffectiveDate",
    label: "Date the notice says it takes effect",
    kind: "date",
    show: (f) => f.issue === "rent_increase_or_termination_notice",
  },
  {
    key: "noticeInWriting",
    label: "Was the notice in writing?",
    kind: "yesno",
    show: (f) => f.issue === "rent_increase_or_termination_notice",
  },
  {
    key: "noticeOnFormA",
    label: "Was it on the official Form A?",
    kind: "yesno",
    show: (f) => f.issue === "rent_increase_or_termination_notice" && f.premisesType === "business",
  },
  { key: "tenantName", label: "Your name", kind: "text" },
  { key: "landlordName", label: "Landlord's name", kind: "text" },
  { key: "premisesLocation", label: "Where is the house/shop?", kind: "text" },
];
