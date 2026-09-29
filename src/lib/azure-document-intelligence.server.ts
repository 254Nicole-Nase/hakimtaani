import { getAzureDocumentIntelligenceConfig } from "./azure-config.server";

export async function extractDocumentText(base64: string, mimeType: string): Promise<string> {
  const cfg = getAzureDocumentIntelligenceConfig();
  if (!cfg) throw new Error("Azure Document Intelligence is not configured");

  const endpoint = cfg.endpoint.replace(/\/$/, "");
  const url = `${endpoint}/documentintelligence/documentModels/prebuilt-read:analyze?_ignoreTimezone=true&api-version=2024-11-01`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": cfg.apiKey,
    },
    body: JSON.stringify({ base64Source: base64 }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Document Intelligence analyze failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  const operationLocation = res.headers.get("Operation-Location");
  if (!operationLocation) {
    throw new Error("Document Intelligence did not return an Operation-Location header");
  }

  for (let i = 0; i < 30; i += 1) {
    await new Promise((r) => setTimeout(r, 1000));
    const poll = await fetch(operationLocation, {
      headers: { "api-key": cfg.apiKey },
    });
    if (!poll.ok) {
      const text = await poll.text();
      throw new Error(
        `Document Intelligence poll failed (${poll.status}): ${text.slice(0, 200)}`,
      );
    }
    const json = (await poll.json()) as {
      status: string;
      analyzeResult?: { content?: string };
    };
    if (json.status === "succeeded") {
      return json.analyzeResult?.content ?? "";
    }
    if (json.status === "failed") throw new Error("Document Intelligence analysis failed");
  }

  throw new Error("Document Intelligence analysis timed out");
}
