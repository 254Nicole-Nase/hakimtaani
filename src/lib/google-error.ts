// Classify Google API failures without exposing provider messages, prompts, keys or IDs.
type Obj = Record<string, unknown>;
function object(value: unknown): Obj | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Obj : undefined;
}
export function classifyGoogleError(body: unknown, httpStatus: number) {
  const envelope = object(Array.isArray(body) ? body[0] : body);
  const error = object(envelope?.["error"]) ?? envelope;
  const status = typeof error?.["status"] === "string" ? error["status"] : "";
  const message = typeof error?.["message"] === "string" ? error["message"].toLowerCase() : "";
  const details = Array.isArray(error?.["details"]) ? error["details"] : [];
  const reasons = details.map((detail) => object(detail)?.["reason"]);
  if (reasons.includes("API_KEY_INVALID") || /api key not valid|invalid (auth|api) key|api key (is )?(expired|invalid)|api key was reported as leaked/.test(message)) return "invalid-key";
  if (reasons.includes("API_KEY_SERVICE_BLOCKED") || reasons.includes("API_KEY_HTTP_REFERRER_BLOCKED") || reasons.includes("API_KEY_IP_ADDRESS_BLOCKED") || reasons.includes("SERVICE_DISABLED") || /api key.*(restricted|blocked)|service.*not enabled/.test(message)) return "key-or-service-restriction";
  if (/standard (api )?key|authorization (api )?key|auth keys? (is|are) required/.test(message)) return "key-type";
  if (/location is not supported|unsupported (user )?location|not available in your (country|region)/.test(message)) return "location";
  if (/billing|paid tier|prepaid balance/.test(message)) return "billing";
  if (httpStatus === 401 || status === "UNAUTHENTICATED") return "authentication";
  if (httpStatus === 403 || status === "PERMISSION_DENIED") return "permission";
  if (httpStatus === 429 || status === "RESOURCE_EXHAUSTED") return "quota";
  if (httpStatus === 404 || /model.*(not found|not supported|not available|deprecated)/.test(message)) return "model";
  if (/temperature|top_p|top_k|reasoning_effort|unknown field|invalid json payload|unsupported parameter|candidate.count|logprobs/.test(message)) return "request-parameter";
  if (status === "FAILED_PRECONDITION") return "precondition";
  if (httpStatus === 400 || status === "INVALID_ARGUMENT") return "invalid-argument";
  if (httpStatus >= 500) return "upstream-unavailable";
  return "other";
}
