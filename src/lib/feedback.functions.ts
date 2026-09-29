import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EVENT_TYPES = [
  "question_helpful",
  "question_not_helpful",
  "contract_helpful",
  "contract_not_helpful",
  "general_rating",
] as const;

const FeedbackInput = z.object({
  eventType: z.enum(EVENT_TYPES),
  rating: z.number().min(1).max(5).optional(),
  metadata: z.record(z.any()).optional(),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => FeedbackInput.parse(input))
  .handler(async ({ data }) => {
    const { createPublishableServerClient } = await import("./supabase-publishable.server");
    const supabase = createPublishableServerClient();

    const { error } = await (supabase as any).from("feedback_events").insert({
      event_type: data.eventType,
      rating: data.rating,
      metadata: data.metadata ?? {},
    });

    if (error) throw error;
    return { ok: true };
  });
