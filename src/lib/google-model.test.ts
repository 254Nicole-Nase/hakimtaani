import assert from "node:assert/strict";
import test from "node:test";
import { resolveGoogleModel } from "./google-model.ts";

test("Google defaults to the replacement model when configuration is absent", () => {
  assert.deepEqual(resolveGoogleModel(undefined), { model: "gemini-3.6-flash", source: "default" });
  assert.deepEqual(resolveGoogleModel("  "), { model: "gemini-3.6-flash", source: "default" });
});
test("Google migrates the deprecated alias and preserves other explicit settings", () => {
  assert.deepEqual(resolveGoogleModel("gemini-3.7-flash"), { model: "gemini-3.6-flash", source: "legacy-alias" });
  assert.deepEqual(resolveGoogleModel(" gemini-3.8-flash "), { model: "gemini-3.8-flash", source: "environment" });
});
