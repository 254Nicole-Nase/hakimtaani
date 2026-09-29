import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

function createAzureFetch(apiVersion: string): typeof fetch {
  return async (input, init) => {
    const url = new URL(input.toString());
    if (!url.searchParams.has("api-version")) {
      url.searchParams.set("api-version", apiVersion);
    }
    return fetch(url, init);
  };
}

export function createAzureOpenAiProvider(
  endpoint: string,
  apiKey: string,
  deploymentName: string,
) {
  const baseURL = `${endpoint.replace(/\/$/, "")}/openai/deployments/${deploymentName}`;
  return createOpenAICompatible({
    name: "azure-openai",
    baseURL,
    headers: { "api-key": apiKey },
    fetch: createAzureFetch("2024-06-01"),
  });
}
