import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TranscribeInput = z.object({
  audioBase64: z.string().min(100),
  format: z.enum(["webm", "m4a", "mp4", "wav", "mp3", "ogg"]),
  language: z.enum(["en", "sw"]).default("en"),
});

type ChatTranscriber = { url: string; headers: Record<string, string>; model: string };

/** A multimodal chat endpoint that can transcribe audio when Azure Speech is unavailable. */
function getChatTranscriber(): ChatTranscriber | null {
  const googleKey = process.env["GOOGLE_API_KEY"];
  if (googleKey) {
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      headers: { Authorization: `Bearer ${googleKey}` },
      model: process.env["GOOGLE_AI_MODEL"] || "gemini-3.7-flash",
    };
  }
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (lovableKey) {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      headers: { "Lovable-API-Key": lovableKey },
      model: "google/gemini-3.7-flash",
    };
  }
  return null;
}

function chatTranscribe(
  target: ChatTranscriber,
  audioBase64: string,
  format: string,
): Promise<string> {
  return fetch(target.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...target.headers,
    },
    body: JSON.stringify({
      model: target.model,
      messages: [
        {
          role: "system",
          content:
            "You transcribe short spoken legal questions from Kenyan users. The speech may be in English, Kiswahili, or Sheng, often mixed. Return ONLY the transcript, verbatim, with no translation, labels, or commentary. If nothing intelligible is spoken, return an empty string.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this recording." },
            { type: "input_audio", input_audio: { data: audioBase64, format } },
          ],
        },
      ],
      temperature: 0,
    }),
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Too many requests right now — wait a moment and try again.");
      if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
      throw new Error(`Transcription failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content?.trim() ?? "";
  });
}

export const transcribeQuestion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TranscribeInput.parse(input))
  .handler(async ({ data }) => {
    const format = data.format === "mp4" ? "m4a" : data.format;

    const { getAzureSpeechConfig } = await import("./azure-config.server");
    if (getAzureSpeechConfig()) {
      try {
        const { transcribeWithAzureSpeech } = await import("./azure-speech.server");
        const transcript = await transcribeWithAzureSpeech(
          data.audioBase64,
          format,
          data.language,
        );
        return { transcript };
      } catch (err) {
        const fallback = getChatTranscriber();
        if (!fallback) {
          throw err instanceof Error
            ? err
            : new Error("Speech transcription failed and no fallback is configured.");
        }
        const transcript = await chatTranscribe(fallback, data.audioBase64, format);
        return { transcript };
      }
    }

    const target = getChatTranscriber();
    if (!target) {
      throw new Error(
        "No speech provider configured. Add Azure Speech keys, GOOGLE_API_KEY, or LOVABLE_API_KEY.",
      );
    }
    const transcript = await chatTranscribe(target, data.audioBase64, format);
    return { transcript };
  });
