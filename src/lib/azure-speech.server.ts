import { getAzureSpeechConfig } from "./azure-config.server";

const LANGUAGE_MAP: Record<string, string> = {
  en: "en-US",
  sw: "sw-KE",
};

function contentTypeFromFormat(format: string): string {
  if (format === "m4a") return "audio/mp4";
  if (format === "ogg") return "audio/ogg";
  return "audio/webm; codecs=opus";
}

export async function transcribeWithAzureSpeech(
  audioBase64: string,
  format: string,
  language: "en" | "sw" = "en",
): Promise<string> {
  const cfg = getAzureSpeechConfig();
  if (!cfg) throw new Error("Azure Speech is not configured");

  const lang = LANGUAGE_MAP[language] ?? "en-US";
  const contentType = contentTypeFromFormat(format);
  const bytes = Buffer.from(audioBase64, "base64");

  const url = `https://${cfg.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${lang}&format=simple`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": cfg.apiKey,
      "Content-Type": contentType,
      Accept: "application/json",
    },
    body: bytes,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Speech transcription failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    DisplayText?: string;
    RecognitionStatus?: string;
  };
  if (json.RecognitionStatus && json.RecognitionStatus !== "Success") {
    throw new Error(`Speech recognition status: ${json.RecognitionStatus}`);
  }
  return json.DisplayText ?? "";
}
