/**
 * Registry of legal provisions the Case Builder is allowed to rely on.
 *
 * Every figure, deadline and citation the rules engine produces points at an
 * entry here, so the UI can show exactly which provision backs each line and
 * the letter drafter can be checked against a closed list of citations.
 */

export type LawRef = {
  id: string;
  /** Short citation as it should appear in letters, e.g. "Employment Act 2007, s.49(1)(c)". */
  cite: string;
  /** Plain-language statement of what the provision says. */
  summary: string;
};

export const LAW = {
  ea_18_4: {
    id: "ea_18_4",
    cite: "Employment Act 2007, s.18(4)",
    summary:
      "A dismissed employee must be paid all monies, allowances and benefits due up to the date of dismissal.",
  },
  ea_28_1: {
    id: "ea_28_1",
    cite: "Employment Act 2007, s.28(1)",
    summary:
      "At least 21 working days of paid leave for every 12 months worked; where employment ends part-way through a leave year, at least 1.75 days for each completed month.",
  },
  ea_35_1: {
    id: "ea_35_1",
    cite: "Employment Act 2007, s.35(1)",
    summary:
      "A contract paying wages monthly can only be ended with 28 days' written notice; one paying at shorter intervals needs notice of one pay period.",
  },
  ea_35_5: {
    id: "ea_35_5",
    cite: "Employment Act 2007, s.35(5)–(6)",
    summary:
      "Service pay for every year worked when a monthly contract is ended by notice — unless the employee was in NSSF, a registered pension/provident fund, or a better gratuity scheme.",
  },
  ea_36: {
    id: "ea_36",
    cite: "Employment Act 2007, s.36",
    summary:
      "Either party may end the contract by paying the wages the employee would have earned during the notice period instead of giving notice.",
  },
  ea_40_1: {
    id: "ea_40_1",
    cite: "Employment Act 2007, s.40(1)",
    summary:
      "Redundancy requires one month's written notice to the employee (or union) and the labour officer, payment of leave in cash, one month's notice or pay in lieu, and severance of at least 15 days' pay per completed year of service.",
  },
  ea_41: {
    id: "ea_41",
    cite: "Employment Act 2007, s.41",
    summary:
      "Before dismissing for misconduct, poor performance or incapacity, the employer must explain the reason to the employee, in a language they understand, and hear their side with a colleague or union representative present.",
  },
  ea_43_45: {
    id: "ea_43_45",
    cite: "Employment Act 2007, ss.43 & 45",
    summary:
      "The employer must prove a valid and fair reason for termination and follow a fair procedure; otherwise the termination is unfair.",
  },
  ea_47_1: {
    id: "ea_47_1",
    cite: "Employment Act 2007, s.47(1)",
    summary:
      "An employee who was summarily or unfairly dismissed may complain to a labour officer within three months of the dismissal.",
  },
  ea_49_1c: {
    id: "ea_49_1c",
    cite: "Employment Act 2007, s.49(1)(c)",
    summary:
      "For unfair termination, compensation of up to twelve months' gross salary, at the court's or labour officer's discretion.",
  },
  ea_51: {
    id: "ea_51",
    cite: "Employment Act 2007, s.51",
    summary: "On termination, the employer must issue a certificate of service.",
  },
  ea_90: {
    id: "ea_90",
    cite: "Employment Act 2007, s.90",
    summary:
      "Claims under the Act must be filed within three years of the act complained of, or within twelve months after a continuing wrong stops.",
  },
  const_162: {
    id: "const_162",
    cite: "Constitution of Kenya 2010, Art. 162(2)(a)",
    summary:
      "Employment and labour disputes are heard by the Employment and Labour Relations Court.",
  },
  const_40_43: {
    id: "const_40_43",
    cite: "Constitution of Kenya 2010, Arts. 40 & 43(1)(b)",
    summary:
      "Protection of property and the right to accessible and adequate housing; no one may be deprived of property or home except through due process.",
  },
  cap301_4: {
    id: "cap301_4",
    cite: "Landlord and Tenant (Shops, Hotels and Catering Establishments) Act, Cap 301, s.4",
    summary:
      "For a controlled business tenancy, a landlord who wants to raise rent, change terms or terminate must serve the prescribed notice (Form A) at least two months before it takes effect; the tenant may object in writing within one month of receiving it.",
  },
  cap301_12: {
    id: "cap301_12",
    cite: "Landlord and Tenant (Shops, Hotels and Catering Establishments) Act, Cap 301, s.12",
    summary:
      "The Business Premises Rent Tribunal can vary rent, order a tenant reinstated, and award compensation for unlawful eviction.",
  },
  cap293: {
    id: "cap293",
    cite: "Distress for Rent Act, Cap 293, and Auctioneers Act 1996",
    summary:
      "A landlord may only seize a tenant's goods for unpaid rent through a licensed auctioneer following the statutory distress procedure — not by self-help.",
  },
  scc_act: {
    id: "scc_act",
    cite: "Small Claims Court Act 2016",
    summary:
      "Money claims such as a withheld deposit, up to KES 1,000,000, can be filed without an advocate and are meant to be decided within 60 days.",
  },
  loa_4: {
    id: "loa_4",
    cite: "Limitation of Actions Act, Cap 22, s.4(1)",
    summary: "Claims founded on a contract must be brought within six years.",
  },
} as const satisfies Record<string, LawRef>;

export type LawId = keyof typeof LAW;

export function lawRef(id: LawId): LawRef {
  return LAW[id];
}
