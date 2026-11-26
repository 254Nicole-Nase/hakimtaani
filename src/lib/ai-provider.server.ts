import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAzureOpenAiProvider } from "./azure-openai.server";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { getAzureOpenAiConfig } from "./azure-config.server";
import { classifyGoogleError } from "./google-error";

export const GOOGLE_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
import { resolveGoogleModel } from "./google-model";
export { DEFAULT_GEMINI_MODEL } from "./google-model";

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

  const googleKey = process.env["GOOGLE_API_KEY"]?.trim();
  if (googleKey) {
    const { model, source } = resolveGoogleModel(process.env["GOOGLE_AI_MODEL"]);
    const loggedModel = /^gemini-[a-z0-9.-]{1,64}$/.test(model) ? model : "custom";
    console.info("[google-ai] selected", { model: loggedModel, source });
    return {
      kind: "google" as const,
      provider: createOpenAICompatible({
        name: "google",
        baseURL: GOOGLE_OPENAI_BASE,
        apiKey: googleKey,
        fetch: async (input, init) => {
          const response = await fetch(input, init);
          if (!response.ok) {
            let payload: unknown;
            try { payload = await response.clone().json(); } catch { /* non-JSON upstream error */ }
            console.warn("[google-ai] rejected", {
              status: response.status,
              category: classifyGoogleError(payload, response.status),
              model: loggedModel,
              source,
            });
          }
          return response;
        },
      }),
      model,
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
