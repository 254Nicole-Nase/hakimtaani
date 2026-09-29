import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

const TOPIC_SCHEMA = z.enum(["tenancy", "employment", "consumer", "unknown"]);
type Topic = z.infer<typeof TOPIC_SCHEMA>;

const TOPIC_NAMES: Record<Topic, string> = {
  tenancy: "Landlord / tenant rights",
  employment: "Worker / employment rights",
  consumer: "Consumer protection",
  unknown: "General Kenyan legal information",
};

const AskInput = z.object({ question: z.string().min(3).max(2000) });

const STOPWORDS = new Set([
  "the","a","an","is","are","can","my","me","i","to","of","in","on","for","and","or","if","it",
  "do","does","did","was","were","be","been","have","has","had","what","how","when","where","who",
  "why","which","with","without","not","no","yes","should","would","could","will","shall","from",
  "this","that","they","them","he","she","his","her","you","your","our","we","us","at","by","as",
  "am","kwa","na","ya","wa","je","ni","katika","au","yangu","langu","kama","nini",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Lexical relevance ranking over the corpus so long statute libraries stay
 * within the model's context while keeping the most on-point sections.
 */
function rankChunks<T extends { content: string; documents: { title: string } }>(
  question: string,
  chunks: T[],
): T[] {
  const terms = tokenize(question);
  if (terms.length === 0) return chunks;
  return chunks
    .map((c) => {
      const haystack = `${c.documents.title} ${c.content}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (haystack.includes(t)) score += 1;
        if (t.length > 5 && haystack.includes(t.slice(0, t.length - 1))) score += 0.5;
      }
      return { c, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);
}

async function classifyQuestion(
  question: string,
  provider: (modelId: string) => unknown,
  model: string,
): Promise<Topic> {
  const { text } = await generateText({
    model: provider(model) as never,
    prompt: `Classify this Kenyan legal question into exactly one of: tenancy, employment, consumer, or unknown.\n\nQuestion: ${question}\n\nReply with only the single lowercase word.`,
    temperature: 0.1,
  });

  const raw = text.trim().toLowerCase();
  const parsed = TOPIC_SCHEMA.safeParse(raw);
  return parsed.success ? parsed.data : "unknown";
}

export const askLegalQuestion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data }) => {
    const [{ getAiProvider }, { createPublishableServerClient }] = await Promise.all([
      import("./ai-provider.server"),
      import("./supabase-publishable.server"),
    ]);

    const supabase = createPublishableServerClient();
    const { provider, model } = getAiProvider();
    const topic = await classifyQuestion(data.question, provider, model);

    const { data: topicRow, error: topicError } = await supabase
      .from("legal_topics")
      .select("id")
      .eq("name", topic)
      .single();

    if (topicError) throw topicError;
    if (!topicRow) {
      return {
        answer:
          "I do not have enough information in my knowledge base to answer this confidently. Try asking about tenancy, employment, or consumer rights, or contact a legal aid clinic.",
        topic: TOPIC_NAMES[topic],
        citations: [],
      };
    }

    const { data: chunks, error } = await supabase
      .from("chunks")
      .select("id, content, chunk_index, documents!inner(id, title, source_name)")
      .eq("documents.topic_id", topicRow.id)
      .order("chunk_index");

    if (error) throw error;

    const safeChunks = (chunks ?? []) as {
      id: string;
      content: string;
      chunk_index: number;
      documents: { id: string; title: string; source_name: string | null };
    }[];

    if (safeChunks.length === 0) {
      return {
        answer:
          "I do not have enough information in my knowledge base to answer this confidently. Try asking about tenancy, employment, or consumer rights, or contact a legal aid clinic.",
        topic: TOPIC_NAMES[topic],
        citations: [],
      };
    }

    const ranked = rankChunks(data.question, safeChunks).slice(0, 14);
    const context = ranked
      .map((c, i) => `[${i + 1}] (${c.documents.title}) ${c.content}`)
      .join("\n\n");

    const { text: answer } = await generateText({
      model: provider(model) as never,
      system:
        "You are HakiMtaani, a Kenyan legal information assistant. Answer only from the provided legal excerpts. Cite with [1], [2] etc. after each claim, and name the statute and section in the sentence itself (e.g. \"under section 41 of the Employment Act 2007\"). If the excerpts do not cover the question, say so plainly instead of guessing. Do not give legal advice; say this is general legal information and the user should consult a lawyer or legal aid clinic for their specific case. Be concise and plain-spoken; answer in Kiswahili if the question is in Kiswahili.",
      prompt: `Topic: ${TOPIC_NAMES[topic]}\n\nLegal excerpts:\n${context}\n\nQuestion: ${data.question}\n\nProvide a clear answer with citations.`,
      temperature: 0.3,
    });

    await supabase
      .from("usage_events")
      .insert({ event_type: "question", topic: TOPIC_NAMES[topic] });

    const citations = ranked
      .map((c, i) => ({
        id: c.id,
        index: i + 1,
        content: c.content,
        documentTitle: c.documents.title,
        sourceName: c.documents.source_name,
      }))
      .filter((c) => answer.includes(`[${c.index}]`));

    return {
      answer,
      topic: TOPIC_NAMES[topic],
      citations,
    };
  });
