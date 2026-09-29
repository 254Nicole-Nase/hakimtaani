import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ReferralInput = z.object({
  target: z.string().min(1).max(120),
});

export const logReferral = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ReferralInput.parse(input))
  .handler(async ({ data }) => {
    const { createPublishableServerClient } = await import("./supabase-publishable.server");
    const supabase = createPublishableServerClient();
    await supabase
      .from("usage_events")
      .insert({ event_type: "referral", referral_target: data.target });
    return { ok: true };
  });

export type ImpactStats = {
  questions: number;
  contracts: number;
  referrals: number;
  clausesFlagged: number;
  avgRiskScore: number | null;
  byTopic: { topic: string; count: number }[];
  topReferrals: { target: string; count: number }[];
  last30Days: { date: string; count: number }[];
  feedbackCount: number;
  avgRating: number | null;
  thumbsUp: number;
  thumbsDown: number;
};

export const getImpactStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<ImpactStats> => {
    const { createPublishableServerClient } = await import("./supabase-publishable.server");
    const supabase = createPublishableServerClient();

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("usage_events")
      .select("event_type, topic, risk_score, flagged_clauses, referral_target, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) throw error;
    const rows = data ?? [];

    const questions = rows.filter((r) => r.event_type === "question").length;
    const contractRows = rows.filter((r) => r.event_type === "contract_analysis");
    const referralRows = rows.filter((r) => r.event_type === "referral");

    const clausesFlagged = contractRows.reduce((sum, r) => sum + (r.flagged_clauses ?? 0), 0);
    const scores = contractRows
      .map((r) => r.risk_score)
      .filter((s): s is number => typeof s === "number");
    const avgRiskScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    const topicMap = new Map<string, number>();
    for (const r of rows) {
      if (!r.topic) continue;
      topicMap.set(r.topic, (topicMap.get(r.topic) ?? 0) + 1);
    }

    const referralMap = new Map<string, number>();
    for (const r of referralRows) {
      const t = r.referral_target ?? "Unknown";
      referralMap.set(t, (referralMap.get(t) ?? 0) + 1);
    }

    const dayMap = new Map<string, number>();
    for (const r of rows) {
      if (!r.created_at || r.created_at < since) continue;
      const day = r.created_at.slice(0, 10);
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    }

    const { data: feedbackData, error: feedbackError } = await (supabase as any)
      .from("feedback_events")
      .select("event_type, rating, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (feedbackError) throw feedbackError;
    const feedbackRows = (feedbackData ?? []) as {
      event_type: string;
      rating: number | null;
      created_at: string;
    }[];

    const feedbackCount = feedbackRows.length;
    const ratings = feedbackRows
      .map((r) => r.rating)
      .filter((r): r is number => typeof r === "number");
    const avgRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;
    const thumbsUp = feedbackRows.filter((r) => r.event_type.includes("_helpful")).length;
    const thumbsDown = feedbackRows.filter((r) => r.event_type.includes("_not_helpful")).length;

    return {
      questions,
      contracts: contractRows.length,
      referrals: referralRows.length,
      clausesFlagged,
      avgRiskScore,
      byTopic: [...topicMap.entries()]
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => b.count - a.count),
      topReferrals: [...referralMap.entries()]
        .map(([target, count]) => ({ target, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
      last30Days: [...dayMap.entries()]
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      feedbackCount,
      avgRating,
      thumbsUp,
      thumbsDown,
    };
  },
);
