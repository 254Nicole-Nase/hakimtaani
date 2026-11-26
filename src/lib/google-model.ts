// Keep the Google text and audio paths on the same configurable model.
export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

export function resolveGoogleModel(configured: string | undefined) {
  const value = configured?.trim();
  if (!value) return { model: DEFAULT_GEMINI_MODEL, source: "default" as const };
  // Migrate the deprecated 3.7 alias; honor other explicit model choices.
  if (value === "gemini-3.7-flash") {
    return { model: DEFAULT_GEMINI_MODEL, source: "legacy-alias" as const };
  }
  return { model: value, source: "environment" as const };
}
