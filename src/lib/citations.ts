/**
 * Citation verification: finds references to Kenyan statutes in generated text
 * and checks each one against the source passages the model was given.
 *
 * A reference is "verified" only if the same instrument and section appear in
 * a source. This catches the most damaging failure in legal AI — a confident
 * citation to a section that says something else, or does not exist.
 */

import { LAW } from "./case/law.ts";

/** HakiMtaani's reviewed provisions, accepted as sources alongside retrieved passages. */
export const REVIEWED_SOURCES: string[] = Object.values(LAW).map((l) => `${l.cite}: ${l.summary}`);

export type Provision = {
  /** Normalised instrument key, e.g. "employment_act", "cap301", "constitution". */
  instrument: string;
  /** Section or article number; null for a reference to the instrument as a whole. */
  section: number | null;
  /** The text as it appeared, for display. */
  text: string;
};

export type Verification = {
  checked: number;
  verified: number;
  unverified: string[];
};

// Order matters: more specific names must match before their substrings.
const INSTRUMENTS: [RegExp, string][] = [
  [/employment and labour relations court act/i, "elrc_act"],
  [/employment act|sheria ya ajira/i, "employment_act"],
  [/labour relations act/i, "labour_relations_act"],
  [/labour institutions act/i, "labour_institutions_act"],
  [/landlord and tenant \(shops|shops,? hotels and catering|cap\.?\s*301\b/i, "cap301"],
  [/rent restriction act|cap\.?\s*296\b/i, "cap296"],
  [/distress for rent act|cap\.?\s*293\b/i, "cap293"],
  [/limitation of actions act|cap\.?\s*22\b/i, "cap22"],
  [/consumer protection act/i, "consumer_protection_act"],
  [/competition act/i, "competition_act"],
  [/data protection act/i, "data_protection_act"],
  [/small claims court act/i, "small_claims_act"],
  [/auctioneers act/i, "auctioneers_act"],
  [/land act/i, "land_act"],
  [/constitution|katiba/i, "constitution"],
];

const INSTRUMENT_PATTERN = new RegExp(INSTRUMENTS.map(([re]) => re.source).join("|"), "gi");

const SECTION_PATTERN =
  /\b(?:sections?|ss?\.|kifungu|vifungu|articles?|arts?\.|ibara)\s*(?:(?:cha|ya|la)\s+)?(\d+)(?:\([^)]*\))*(?:\s*(?:-|–|to|and|&|na|hadi)\s*(?:s\.\s*)?(\d+))?/gi;

function instrumentKey(text: string): string | null {
  for (const [re, key] of INSTRUMENTS) if (re.test(text)) return key;
  return null;
}

function sentences(text: string): string[] {
  // Keep "s.41" and "Art." intact while splitting on sentence punctuation.
  return text.split(/(?<!\b(?:[sS]s?|[aA]rts?|[cC]ap|No))[.!?;\n]+\s+/);
}

type InstrumentMatch = { key: string | null; at: number; text: string };

/**
 * Chooses which named instrument a section number belongs to: one written
 * immediately before it ("Employment Act 2007, s.41"), else one introduced by
 * "of the" after it ("section 41 of the Employment Act"), else the closest.
 */
function pickInstrument(
  sentence: string,
  instruments: InstrumentMatch[],
  at: number,
  length: number,
): InstrumentMatch {
  const gap = (i: InstrumentMatch) =>
    i.at < at ? sentence.slice(i.at + i.text.length, at) : sentence.slice(at + length, i.at);
  const before = instruments.filter((i) => i.at < at && /^[\s\d,()]*$/.test(gap(i)));
  if (before.length > 0) return before[before.length - 1]!;
  const after = instruments.find(
    (i) => i.at > at && /^\s*(?:of(?: the)?|cha|ya|la)\s+(?:the\s+)?$/i.test(gap(i)),
  );
  if (after) return after;
  return instruments.reduce((best, i) => (Math.abs(i.at - at) < Math.abs(best.at - at) ? i : best));
}

/** Extracts every statute reference in `text`, resolving bare section numbers to the nearest named instrument. */
export function parseProvisions(text: string): Provision[] {
  const out: Provision[] = [];
  for (const sentence of sentences(text)) {
    const instruments: InstrumentMatch[] = [...sentence.matchAll(INSTRUMENT_PATTERN)].map((m) => ({
      key: instrumentKey(m[0]),
      at: m.index,
      text: m[0],
    }));
    const sections = [...sentence.matchAll(SECTION_PATTERN)];

    for (const s of sections) {
      const isArticle = /^(?:art|ibara)/i.test(s[0]);
      let key: string | null = isArticle ? "constitution" : null;
      let label = "";
      if (!key && instruments.length > 0) {
        // Prefer the closest named instrument, whichever side it is on.
        const nearest = pickInstrument(sentence, instruments, s.index, s[0].length);
        key = nearest.key;
        label = ` (${nearest.text})`;
      }
      if (!key) continue;
      const from = Number(s[1]);
      const to = s[2] ? Number(s[2]) : from;
      for (let n = from; n <= Math.min(to, from + 20); n += 1) {
        out.push({ instrument: key, section: n, text: `${s[0].trim()}${label}` });
      }
    }

    // An instrument named on its own ("the Rent Restriction Act") with no section.
    if (sections.length === 0) {
      for (const i of instruments) {
        if (i.key) out.push({ instrument: i.key, section: null, text: i.text });
      }
    }
  }
  return out;
}

export function buildSourceIndex(sources: string[]): Set<string> {
  const index = new Set<string>();
  for (const src of sources) {
    for (const p of parseProvisions(src)) {
      index.add(p.instrument);
      if (p.section != null) index.add(`${p.instrument}:${p.section}`);
    }
  }
  return index;
}

function isSupported(p: Provision, index: Set<string>): boolean {
  return p.section == null ? index.has(p.instrument) : index.has(`${p.instrument}:${p.section}`);
}

/** Checks every statute reference in `text` against `sources`. */
export function verifyCitations(text: string, sources: string[]): Verification {
  const index = buildSourceIndex(sources);
  const seen = new Map<string, { text: string; ok: boolean }>();
  for (const p of parseProvisions(text)) {
    const key = `${p.instrument}:${p.section ?? "*"}`;
    const ok = isSupported(p, index);
    const prev = seen.get(key);
    seen.set(key, { text: p.text, ok: (prev?.ok ?? true) && ok });
  }
  const all = [...seen.values()];
  return {
    checked: all.length,
    verified: all.filter((x) => x.ok).length,
    unverified: [...new Set(all.filter((x) => !x.ok).map((x) => x.text))],
  };
}
