import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAzureOpenAiProvider } from "./azure-openai.server";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { getAzureOpenAiConfig } from "./azure-config.server";

export const GOOGLE_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
export const DEFAULT_GEMINI_MODEL = "gemini-3.7-flash";

/**
 * Picks the AI provider from the environment, in priority order:
 * Azure OpenAI (Imagine Cup target) → Google Gemini (runs anywhere, e.g. Vercel)
 * → Lovable AI Gateway (only works inside Lovable).
 */
export function getAiProvider() {
  const azureCfg = getAzureOpenAiConfig();
  if (azureCfg) {
    return {
      kind: "azure" as const,
      provider: createAzureOpenAiProvider(
        azureCfg.endpoint,
        azureCfg.apiKey,
        azureCfg.deploymentName,
      ),
      model: azureCfg.deploymentName,
    };
  }

  const googleKey = process.env["GOOGLE_API_KEY"];
  if (googleKey) {
    return {
      kind: "google" as const,
      provider: createOpenAICompatible({
        name: "google",
        baseURL: GOOGLE_OPENAI_BASE,
        apiKey: googleKey,
      }),
      model: process.env["GOOGLE_AI_MODEL"] || DEFAULT_GEMINI_MODEL,
    };
  }

  const key = process.env["LOVABLE_API_KEY"];
  if (!key) {
    throw new Error(
      "No AI provider configured. Add Azure OpenAI environment variables, GOOGLE_API_KEY, or LOVABLE_API_KEY.",
    );
  }
  return {
    kind: "lovable" as const,
    provider: createLovableAiGatewayProvider(key),
    model: "google/gemini-3.7-flash",
  };
}
