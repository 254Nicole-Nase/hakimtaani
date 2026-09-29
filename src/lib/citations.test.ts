/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProvisions, verifyCitations } from "./citations.ts";

const SOURCES = [
  "(Employment Act 2007 — contracts, pay and termination) Employment Act 2007, s.41: before terminating for misconduct, poor performance or incapacity the employer must explain the reason.",
  "(Employment Act 2007 — contracts, pay and termination) Employment Act 2007, s.43-45: the employer must prove the reason for termination.",
  "(Landlord and Tenant (Shops, Hotels and Catering Establishments) Act, Cap 301) Cap 301, s.4(2): a landlord must give notice in Form A of not less than two months.",
  "(Constitution of Kenya 2010) Constitution of Kenya 2010, Article 43(1)(b): every person has the right to accessible and adequate housing.",
];

describe("parseProvisions", () => {
  it("reads 'section N of the X Act'", () => {
    const p = parseProvisions("Under section 41 of the Employment Act 2007 you must be heard.");
    assert.deepEqual(
      p.map((x) => [x.instrument, x.section]),
      [["employment_act", 41]],
    );
  });

  it("reads 'X Act, s.N(n)' and expands ranges", () => {
    const p = parseProvisions("See Employment Act 2007, ss.43-45 and Cap 301, s.4(2).");
    assert.deepEqual(
      p.map((x) => `${x.instrument}:${x.section}`),
      ["employment_act:43", "employment_act:44", "employment_act:45", "cap301:4"],
    );
  });

  it("maps articles to the Constitution", () => {
    const p = parseProvisions("Article 43(1)(b) protects housing.");
    assert.deepEqual(
      p.map((x) => `${x.instrument}:${x.section}`),
      ["constitution:43"],
    );
  });

  it("does not split sentences on 's.' abbreviations", () => {
    const p = parseProvisions(
      "Under s. 41 of the Employment Act you must be heard. Rights matter.",
    );
    assert.deepEqual(
      p.map((x) => `${x.instrument}:${x.section}`),
      ["employment_act:41"],
    );
  });

  it("reads Kiswahili references", () => {
    const p = parseProvisions(
      "Kwa mujibu wa kifungu cha 41 cha Sheria ya Ajira, lazima usikilizwe.",
    );
    assert.deepEqual(
      p.map((x) => `${x.instrument}:${x.section}`),
      ["employment_act:41"],
    );
  });
});

describe("verifyCitations", () => {
  it("verifies references present in the sources", () => {
    const v = verifyCitations(
      "Your employer had to hear you first (section 41 of the Employment Act 2007) [1], and must prove the reason under section 43 of the Employment Act [2]. Business landlords must use Form A (Cap 301, s.4(2)).",
      SOURCES,
    );
    assert.equal(v.checked, 3);
    assert.equal(v.verified, 3);
    assert.deepEqual(v.unverified, []);
  });

  it("flags a section that is not in the sources", () => {
    const v = verifyCitations(
      "You can complain within three months under section 47 of the Employment Act 2007.",
      SOURCES,
    );
    assert.equal(v.verified, 0);
    assert.equal(v.unverified.length, 1);
    assert.match(v.unverified[0] ?? "", /section 47/);
  });

  it("flags a statute that is not in the sources at all", () => {
    const v = verifyCitations("The Land Act protects you.", SOURCES);
    assert.equal(v.checked, 1);
    assert.equal(v.verified, 0);
  });

  it("reports nothing to check for plain text", () => {
    const v = verifyCitations("Talk to a legal aid clinic.", SOURCES);
    assert.equal(v.checked, 0);
  });
});
