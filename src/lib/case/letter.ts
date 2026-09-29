import { parseIsoDate } from "./dates.ts";
import { kes } from "./employment.ts";
import { LAW } from "./law.ts";
import type { CaseAssessment, EmploymentFacts, TenancyFacts } from "./types.ts";

export type Language = "en" | "sw";

export type LetterInput = {
  language: Language;
  today: string;
  /** AI-drafted paragraph describing what happened, already checked by `checkStatement`. */
  statement: string | null;
  /** Ids of entitlement lines the user chose to claim. */
  includedLineIds: string[];
} & (
  | { track: "employment"; facts: EmploymentFacts; assessment: CaseAssessment }
  | { track: "tenancy"; facts: TenancyFacts; assessment: CaseAssessment }
);

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_SW = [
  "Januari",
  "Februari",
  "Machi",
  "Aprili",
  "Mei",
  "Juni",
  "Julai",
  "Agosti",
  "Septemba",
  "Oktoba",
  "Novemba",
  "Desemba",
];

export function formatDate(iso: string, language: Language): string {
  const d = parseIsoDate(iso);
  const months = language === "sw" ? MONTHS_SW : MONTHS_EN;
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const t = (language: Language, en: string, sw: string) => (language === "sw" ? sw : en);

function claimedLines(input: LetterInput) {
  return input.assessment.lines.filter(
    (l) => l.status !== "discretionary" && input.includedLineIds.includes(l.id),
  );
}

function lineList(input: LetterInput): { text: string; total: number } {
  const lines = claimedLines(input);
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const text = lines
    .map(
      (l, i) =>
        `${i + 1}. ${input.language === "sw" ? l.labelSw : l.label}: ${kes(l.amount)} (${LAW[l.law].cite})`,
    )
    .join("\n");
  return { text, total };
}

/** Grounds of unfair termination, phrased in the employee's own voice. */
const TERMINATION_GROUNDS: Record<string, { en: string; sw: string }> = {
  no_valid_reason: {
    en: "No valid or fair reason was given for my dismissal",
    sw: "Sikupewa sababu yoyote halali ya kufutwa kazi",
  },
  no_hearing: {
    en: "I was not told the reason or given a chance to be heard before dismissal",
    sw: "Sikuelezwa sababu wala kupewa nafasi ya kujieleza kabla ya kufutwa kazi",
  },
  redundancy_procedure: {
    en: "The redundancy procedure, including one month's written notice to me and the labour officer, was not followed",
    sw: "Utaratibu wa kupunguza wafanyakazi, ikiwemo notisi ya mwezi mmoja kwa maandishi kwangu na kwa afisa wa kazi, haukufuatwa",
  },
};

function violationList(input: LetterInput): string {
  return input.assessment.findings
    .filter((f) => f.severity === "violation" && TERMINATION_GROUNDS[f.id])
    .map((f) => `- ${TERMINATION_GROUNDS[f.id]![input.language]} (${LAW[f.law].cite})`)
    .join("\n");
}

function employmentBody(input: LetterInput & { track: "employment" }): string[] {
  const { facts: f, language: lang } = input;
  const paras: string[] = [];
  const { text: items, total } = lineList(input);
  const job = f.jobTitle ? t(lang, ` as ${f.jobTitle}`, ` kama ${f.jobTitle}`) : "";

  if (f.startDate) {
    paras.push(
      f.endDate && f.terminationReason !== "still_employed"
        ? t(
            lang,
            `I was employed by you${job} from ${formatDate(f.startDate, lang)} until ${formatDate(f.endDate, lang)}.`,
            `Niliajiriwa nanyi${job} kuanzia ${formatDate(f.startDate, lang)} hadi ${formatDate(f.endDate, lang)}.`,
          )
        : t(
            lang,
            `I have been employed by you${job} since ${formatDate(f.startDate, lang)}.`,
            `Nimeajiriwa nanyi${job} tangu ${formatDate(f.startDate, lang)}.`,
          ),
    );
  }
  if (input.statement) paras.push(input.statement);

  if (items) {
    paras.push(
      t(
        lang,
        `Under the Employment Act 2007, I am entitled to the following payments, which remain outstanding:\n\n${items}\n\nTotal: ${kes(total)}`,
        `Kwa mujibu wa Sheria ya Ajira ya 2007, ninastahili malipo yafuatayo ambayo bado hayajalipwa:\n\n${items}\n\nJumla: ${kes(total)}`,
      ),
    );
  }

  const violations = violationList(input);
  const compensation = input.assessment.lines.find((l) => l.id === "compensation");
  if (violations) {
    paras.push(
      t(
        lang,
        `The termination of my employment was also unlawful for the following reasons:\n\n${violations}`,
        `Kufutwa kwangu kazi pia hakukuwa halali kwa sababu zifuatazo:\n\n${violations}`,
      ),
    );
  }
  if (compensation) {
    paras.push(
      t(
        lang,
        `I reserve my right to claim compensation for unfair termination of up to twelve months' gross salary under ${LAW.ea_49_1c.cite}.`,
        `Ninahifadhi haki yangu ya kudai fidia kwa kufutwa kazi isivyo haki ya hadi mishahara ya miezi kumi na miwili chini ya ${LAW.ea_49_1c.cite}.`,
      ),
    );
  }
  if (f.certificateOfServiceIssued === false) {
    paras.push(
      t(
        lang,
        `I also request my certificate of service as required by ${LAW.ea_51.cite}.`,
        `Pia naomba cheti changu cha utumishi kama inavyotakiwa na ${LAW.ea_51.cite}.`,
      ),
    );
  }

  const demand = total > 0 ? kes(total) : null;
  paras.push(
    demand
      ? t(
          lang,
          `I therefore demand payment of ${demand} within seven (7) days of the date of this letter. If payment is not made, I will lodge a complaint with the Labour Officer and/or file a claim at the Employment and Labour Relations Court without further notice to you.`,
          `Kwa hivyo, ninadai malipo ya ${demand} ndani ya siku saba (7) kuanzia tarehe ya barua hii. Malipo yasipofanywa, nitawasilisha malalamiko kwa Afisa wa Kazi na/au kufungua kesi katika Mahakama ya Ajira na Mahusiano ya Kazi bila kuwapa taarifa nyingine.`,
        )
      : t(
          lang,
          `I request a written response within seven (7) days of the date of this letter, failing which I will lodge a complaint with the Labour Officer.`,
          `Naomba jibu la maandishi ndani ya siku saba (7) kuanzia tarehe ya barua hii, la sivyo nitawasilisha malalamiko kwa Afisa wa Kazi.`,
        ),
  );
  return paras;
}

function tenancyBody(input: LetterInput & { track: "tenancy" }): string[] {
  const { facts: f, language: lang } = input;
  const paras: string[] = [];
  const where = f.premisesLocation
    ? t(lang, ` at ${f.premisesLocation}`, ` iliyoko ${f.premisesLocation}`)
    : "";
  paras.push(
    t(
      lang,
      `I am${f.issue === "deposit_withheld" ? " a former" : " a"} tenant of your premises${where}.`,
      `Mimi ni mpangaji${f.issue === "deposit_withheld" ? " wa zamani" : ""} wa nyumba yenu${where}.`,
    ),
  );
  if (input.statement) paras.push(input.statement);

  switch (f.issue) {
    case "deposit_withheld": {
      const { total } = lineList(input);
      paras.push(
        t(
          lang,
          `${f.moveOutDate ? `I vacated the premises on ${formatDate(f.moveOutDate, lang)} and` : "I have"} handed over vacant possession. My deposit of ${kes(f.depositPaid ?? 0)} has not been refunded. A deposit may only be applied to unpaid rent or damage beyond normal wear and tear, supported by receipts.`,
          `${f.moveOutDate ? `Niliondoka kwenye nyumba tarehe ${formatDate(f.moveOutDate, lang)} na kukabidhi` : "Nimekabidhi"} nyumba ikiwa wazi. Amana yangu ya ${kes(f.depositPaid ?? 0)} haijarejeshwa. Amana inaweza kutumika tu kulipia kodi ambayo haijalipwa au uharibifu zaidi ya uchakavu wa kawaida, kwa kuonyesha risiti.`,
        ),
        t(
          lang,
          `I therefore demand the refund of ${kes(total)} within seven (7) days of the date of this letter, failing which I will file a claim at the Small Claims Court for the amount together with costs.`,
          `Kwa hivyo, ninadai kurejeshewa ${kes(total)} ndani ya siku saba (7) kuanzia tarehe ya barua hii, la sivyo nitafungua kesi katika Mahakama ya Madai Madogo kudai kiasi hicho pamoja na gharama.`,
        ),
      );
      break;
    }
    case "lockout_or_eviction": {
      const law = f.premisesType === "business" ? LAW.cap301_12 : LAW.const_40_43;
      paras.push(
        t(
          lang,
          `${f.incidentDate ? `On ${formatDate(f.incidentDate, lang)}, I` : "I"} was denied access to the premises without any court order. Evicting a tenant by self-help — locking them out, removing doors, or cutting off water or electricity — is unlawful (${law.cite}).`,
          `${f.incidentDate ? `Tarehe ${formatDate(f.incidentDate, lang)}, ni` : "Ni"}linyimwa kuingia kwenye nyumba bila amri yoyote ya mahakama. Kumfukuza mpangaji kwa nguvu — kwa kumfungia nje, kuondoa milango, au kukata maji au umeme — ni kinyume cha sheria (${law.cite}).`,
        ),
        t(
          lang,
          `I demand that you immediately restore my access to the premises and all services, and refrain from any further interference with my tenancy. If access is not restored within twenty-four (24) hours, I will seek urgent orders from the court and claim damages and costs.`,
          `Ninadai mnirejeshee mara moja uwezo wa kuingia kwenye nyumba pamoja na huduma zote, na mkome kuingilia upangaji wangu. Nisiporejeshewa ndani ya saa ishirini na nne (24), nitaomba amri za dharura kutoka mahakamani na kudai fidia na gharama.`,
        ),
      );
      break;
    }
    case "rent_increase_or_termination_notice": {
      const received = f.noticeReceivedDate ? formatDate(f.noticeReceivedDate, lang) : null;
      if (f.premisesType === "business") {
        paras.push(
          t(
            lang,
            `TAKE NOTICE that I do not agree to the notice${received ? ` I received on ${received}` : ""} proposing to change the terms of, or terminate, my tenancy. I make this objection under ${LAW.cap301_4.cite}. The proposed change cannot take effect unless it is approved by the Business Premises Rent Tribunal.`,
            `CHUKUENI TAARIFA kwamba sikubaliani na notisi${received ? ` niliyopokea tarehe ${received}` : ""} inayopendekeza kubadilisha masharti ya upangaji wangu au kuukatisha. Ninatoa pingamizi hili chini ya ${LAW.cap301_4.cite}. Mabadiliko yanayopendekezwa hayawezi kuanza kutumika bila idhini ya Mahakama ya Kodi ya Majengo ya Biashara (Business Premises Rent Tribunal).`,
          ),
        );
        if (
          input.assessment.findings.some((x) => x.id === "short_notice" || x.id === "not_form_a")
        ) {
          paras.push(
            t(
              lang,
              `Further, the notice is invalid because it was not served on the prescribed Form A at least two months before the date it is meant to take effect.`,
              `Zaidi ya hayo, notisi hiyo si halali kwa sababu haikutolewa kwa Fomu A iliyoidhinishwa angalau miezi miwili kabla ya tarehe ya kuanza kutumika.`,
            ),
          );
        }
        paras.push(
          t(
            lang,
            `I will continue to pay the current rent of ${kes(f.monthlyRent ?? 0)} per month until the Tribunal determines the matter.`,
            `Nitaendelea kulipa kodi ya sasa ya ${kes(f.monthlyRent ?? 0)} kwa mwezi hadi Mahakama itakapoamua suala hili.`,
          ),
        );
      } else {
        paras.push(
          t(
            lang,
            `I refer to your notice${received ? ` received on ${received}` : ""} proposing a change to my rent. I do not accept the proposed change. Please provide the basis for it in writing, with reference to the terms of our tenancy agreement. In the meantime I will continue to pay the current rent${f.monthlyRent ? ` of ${kes(f.monthlyRent)} per month` : ""}.`,
            `Ninarejelea notisi yenu${received ? ` niliyopokea tarehe ${received}` : ""} inayopendekeza kubadilisha kodi yangu. Sikubaliani na mabadiliko hayo. Tafadhali nielezeni sababu zake kwa maandishi, kwa kurejelea masharti ya mkataba wetu wa upangaji. Wakati huo huo nitaendelea kulipa kodi ya sasa${f.monthlyRent ? ` ya ${kes(f.monthlyRent)} kwa mwezi` : ""}.`,
          ),
        );
      }
      break;
    }
    case "goods_seized": {
      paras.push(
        t(
          lang,
          `${f.incidentDate ? `On ${formatDate(f.incidentDate, lang)}, my` : "My"} goods were taken from the premises. Goods may only be distrained for rent through a licensed auctioneer following the procedure in the ${LAW.cap293.cite}. Please provide, within three (3) days, the name and licence number of the auctioneer and a copy of the proclamation listing the goods, or return my goods in full.`,
          `${f.incidentDate ? `Tarehe ${formatDate(f.incidentDate, lang)}, mali` : "Mali"} yangu ilichukuliwa kutoka kwenye nyumba. Mali inaweza kukamatwa kwa ajili ya kodi tu kupitia dalali aliyesajiliwa kwa kufuata utaratibu wa ${LAW.cap293.cite}. Tafadhali, ndani ya siku tatu (3), nipeni jina na nambari ya leseni ya dalali pamoja na nakala ya tangazo linaloorodhesha mali hiyo, au mnirudishie mali yangu yote.`,
        ),
      );
      break;
    }
  }
  return paras;
}

export function buildLetter(input: LetterInput): string {
  const lang = input.language;
  const isEmployment = input.track === "employment";
  const sender = isEmployment ? input.facts.employeeName : input.facts.tenantName;
  const recipient = isEmployment ? input.facts.employerName : input.facts.landlordName;

  const subject = isEmployment
    ? t(lang, "DEMAND FOR PAYMENT OF TERMINAL DUES", "MADAI YA MALIPO YA KUACHISHWA KAZI")
    : input.facts.issue === "rent_increase_or_termination_notice" &&
        input.facts.premisesType === "business"
      ? t(lang, "NOTICE OF OBJECTION TO TENANCY NOTICE", "NOTISI YA KUPINGA NOTISI YA UPANGAJI")
      : input.facts.issue === "deposit_withheld"
        ? t(lang, "DEMAND FOR REFUND OF DEPOSIT", "MADAI YA KUREJESHEWA AMANA")
        : input.facts.issue === "goods_seized"
          ? t(lang, "DEMAND FOR RETURN OF GOODS", "MADAI YA KURUDISHIWA MALI")
          : t(
              lang,
              "UNLAWFUL INTERFERENCE WITH MY TENANCY",
              "KUINGILIWA KINYUME CHA SHERIA KWA UPANGAJI WANGU",
            );

  const body = input.track === "employment" ? employmentBody(input) : tenancyBody(input);

  return [
    sender ?? t(lang, "[Your name]", "[Jina lako]"),
    t(lang, "[Your phone number]", "[Nambari yako ya simu]"),
    "",
    formatDate(input.today, lang),
    "",
    `${t(lang, "To", "Kwa")}: ${recipient ?? t(lang, "[Name of employer/landlord]", "[Jina la mwajiri/mwenye nyumba]")}`,
    "",
    t(lang, "Dear Sir/Madam,", "Mpendwa Bwana/Bibi,"),
    "",
    `RE: ${subject}`,
    "",
    ...body.flatMap((p) => [p, ""]),
    t(lang, "Yours faithfully,", "Wako mwaminifu,"),
    "",
    "",
    sender ?? t(lang, "[Your name and signature]", "[Jina na sahihi yako]"),
  ].join("\n");
}

/**
 * Guards the AI-drafted statement of facts: it may describe what happened in
 * the user's words, but amounts and legal citations belong to the rules
 * engine. Returns the problems found; empty means the statement is safe.
 */
export function checkStatement(statement: string): string[] {
  const problems: string[] = [];
  if (
    /\b(?:KES|KSh|shillings?|shilingi)\b|\bsh\.?\s?\d|\b\d{1,3}(?:,\d{3})+\b|\b\d{5,}\b/i.test(
      statement,
    )
  ) {
    problems.push("mentions a money amount");
  }
  if (
    /\b(?:section|s\.\s?\d|sect\.|kifungu|article|art\.|cap\.?\s?\d|act\b|sheria ya)/i.test(
      statement,
    )
  ) {
    problems.push("cites a law");
  }
  if (statement.length > 1200) problems.push("is too long");
  return problems;
}
