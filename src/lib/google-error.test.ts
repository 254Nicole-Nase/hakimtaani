import assert from "node:assert/strict";
import test from "node:test";
import { classifyGoogleError } from "./google-error.ts";

test("classifies safe categories from native and OpenAI-compatible error bodies", () => {
  assert.equal(classifyGoogleError({ error: { status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] } }, 400), "invalid-key");
  assert.equal(classifyGoogleError([{ error: { message: "Invalid Auth key." } }], 400), "invalid-key");
  assert.equal(classifyGoogleError({ error: { message: "User location is not supported for the API use.", status: "FAILED_PRECONDITION" } }, 400), "location");
  assert.equal(classifyGoogleError({ error: { message: "Enable billing to proceed." } }, 400), "billing");
  assert.equal(classifyGoogleError({ error: { message: "Unknown field reasoning_effort" } }, 400), "request-parameter");
  assert.equal(classifyGoogleError({ error: { details: [{ reason: "API_KEY_SERVICE_BLOCKED" }] } }, 403), "key-or-service-restriction");
  assert.equal(classifyGoogleError({ error: { message: "secret prompt or key" } }, 400), "invalid-argument");
  assert.equal(classifyGoogleError(null, 503), "upstream-unavailable");
});
