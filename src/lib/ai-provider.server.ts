import { createAzureOpenAiProvider } from "./azure-openai.server";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { getAzureOpenAiConfig } from "./azure-config.server";

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

  const key = process.env["LOVABLE_API_KEY"];
  if (!key) {
    throw new Error(
      "No AI provider configured. Add Azure OpenAI environment variables or LOVABLE_API_KEY.",
    );
  }
  return {
    kind: "lovable" as const,
    provider: createLovableAiGatewayProvider(key),
    model: "google/gemini-3.7-flash",
  };
}
