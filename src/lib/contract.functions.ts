import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { REVIEWED_SOURCES, verifyCitations } from "./citations";

const AnalyzeInput = z
  .object({
    documentText: z.string().max(60000).optional(),
    documentBase64: z.string().optional(),
    mimeType: z.string().optional(),
    docType: z.enum(["tenancy", "employment"]),
    language: z.enum(["en", "sw"]).default("en"),
  })
  .refine(
    (data) => {
      if (!data.documentBase64 && (!data.documentText || data.documentText.length < 50)) {
        return false;
      }
      return true;
    },
    { message: "Provide a document text or upload a file." },
  );

const SEVERITY = ["illegal", "risky", "unfair", "ok"] as const;

const ClauseSchema = z.object({
  quote: z.string(),
  issue: z.string(),
  severity: z.enum(SEVERITY),
  statute: z.string(),
  section: z.string().optional().default(""),
  explanation: z.string(),
  whatToDo: z.string(),
});

const ResultSchema = z.object({
  summary: z.string(),
  riskScore: z.number().min(0).max(100),
  clauses: z.array(ClauseSchema),
  missingProtections: z.array(
    z.object({ title: z.string(), why: z.string(), statute: z.string() }),
  ),
});

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model did not return JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

export const analyzeContract = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }) => {
    const [{ getAiProvider }, { createPublishableServerClient }] = await Promise.all([
      import("./ai-provider.server"),
      import("./supabase-publishable.server"),
    ]);

    const supabase = createPublishableServerClient();
    const { provider, model } = getAiProvider();

    let documentText = data.documentText ?? "";

    if (data.documentBase64) {
      const { getAzureDocumentIntelligenceConfig } = await import("./azure-config.server");
      const cfg = getAzureDocumentIntelligenceConfig();
      if (cfg) {
        try {
          const { extractDocumentText } = await import("./azure-document-intelligence.server");
          documentText = await extractDocumentText(
            data.documentBase64,
            data.mimeType ?? "application/pdf",
          );
        } catch (err) {
          if (!documentText) {
            throw err instanceof Error
              ? err
              : new Error("Failed to extract text from the uploaded document.");
          }
        }
      } else if (!documentText) {
        throw new Error(
          "Document file uploaded but Azure Document Intelligence is not configured. Paste the text instead.",
        );
      }
    }

    documentText = documentText.trim();
    if (documentText.length < 50) {
      throw new Error("Could not read enough text from the document. Paste the text instead.");
    }

    const { data: topicRow } = await supabase
      .from("legal_topics")
      .select("id")
      .eq("name", data.docType)
      .single();

    let lawContext = "";
    let lawSources: string[] = [];
    if (topicRow) {
      const { data: chunks } = await supabase
        .from("chunks")
        .select("content, chunk_index, documents!inner(title, source_name, topic_id)")
        .eq("documents.topic_id", topicRow.id)
        .order("chunk_index");
      const rows = (chunks ?? []) as {
        content: string;
        documents: { title: string; source_name: string | null };
      }[];
      lawSources = rows.map((c) => `${c.documents.title} ${c.content}`);
      lawContext = rows
        .map((c) => `SOURCE: ${c.documents.title}\n${c.content}`)
        .join("\n\n---\n\n");
    }

    const label =
      data.docType === "tenancy" ? "residential tenancy / lease agreement" : "employment contract";

    const { text } = await generateText({
      model: provider(model) as never,
      system: `You are HakiMtaani's contract evidence engine. You review Kenyan ${label}s against Kenyan law and flag clauses that are illegal, risky, or unfair to the weaker party (tenant or employee).

Rules:
- Ground every finding in a specific Kenyan legal instrument, e.g. Employment Act 2007, Constitution of Kenya 2010, Landlord and Tenant (Shops, Hotels and Catering Establishments) Act, Distress for Rent Act, Rent Restriction Act, Consumer Protection Act 2012. Name the section when you can.
- Quote the offending clause text verbatim (short, max ~40 words) in "quote".
- severity: "illegal" (contradicts a statute), "risky" (legally grey / heavily one-sided), "unfair" (lawful but disadvantageous), "ok" (notable but fine).
- Also list protections the law expects but the document omits.
- riskScore: 0 (clean) to 100 (dangerous).
- ${data.language === "sw" ? "Write all human-readable text in Kiswahili." : "Write in clear plain English."}
- This is legal information, not legal advice.

Return ONLY JSON with this exact shape:
{"summary":string,"riskScore":number,"clauses":[{"quote":string,"issue":string,"severity":"illegal"|"risky"|"unfair"|"ok","statute":string,"section":string,"explanation":string,"whatToDo":string}],"missingProtections":[{"title":string,"why":string,"statute":string}]}`,
      prompt: `Reference Kenyan legal excerpts (ground your findings in these wherever possible; if you cite any other provision, cite the exact Act and section — every citation is checked against the source library):\n${lawContext || "(none available)"}\n\n=== DOCUMENT TO REVIEW (${label}) ===\n${documentText}\n=== END DOCUMENT ===\n\nAnalyse it now and return the JSON.`,
      temperature: 0.2,
    });

    const result = ResultSchema.parse(extractJson(text));
    const sources = [...lawSources, ...REVIEWED_SOURCES];
    const parsed = {
      ...result,
      clauses: result.clauses.map((c) => {
        // A citation the parser cannot recognise at all counts as unverified.
        const v = verifyCitations(`${c.statute} ${c.section}`, sources);
        return { ...c, verified: v.checked > 0 && v.unverified.length === 0 };
      }),
    };

    await supabase.from("usage_events").insert({
      event_type: "contract_analysis",
      topic: data.docType === "tenancy" ? "Landlord / tenant rights" : "Worker / employment rights",
      risk_score: Math.round(parsed.riskScore),
      flagged_clauses: parsed.clauses.filter((c) => c.severity !== "ok").length,
      language: data.language,
    });

    return parsed;
  });
