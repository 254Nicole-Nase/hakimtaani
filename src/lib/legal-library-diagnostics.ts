// Only fixed metadata is logged: never legal questions, document contents, raw
// database errors, credentials or URLs.
export function reportLibraryQuery(
  operation: "chat-topic" | "chat-chunks" | "contract-topic" | "contract-chunks",
  status: number,
  error: { code?: string } | null,
  rowCount: number,
) {
  const code = error?.code;
  const safeCode = code && /^(?:PGRST\d{3}|[0-9A-Z]{5})$/.test(code) ? code : undefined;
  const detail = { operation, status, code: safeCode, rowCount };
  if (error) console.warn("[legal-library] failed", detail);
  else console.info("[legal-library] read", detail);
}
