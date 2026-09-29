import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { submitFeedback } from "@/lib/feedback.functions";

type EventPrefix = "question" | "contract";

export function FeedbackButtons({
  eventTypePrefix,
  metadata,
}: {
  eventTypePrefix: EventPrefix;
  metadata?: Record<string, unknown>;
}) {
  const send = useServerFn(submitFeedback);
  const [submitted, setSubmitted] = useState(false);

  const handle = async (helpful: boolean) => {
    await send({
      data: {
        eventType: `${eventTypePrefix}_${helpful ? "helpful" : "not_helpful"}`,
        rating: helpful ? 5 : 1,
        metadata,
      },
    });
    setSubmitted(true);
  };

  if (submitted) {
    return <p className="text-xs text-muted-foreground">Thanks for your feedback.</p>;
  }

  return (
    <div className="mt-4 flex items-center gap-2 border-t pt-3">
      <span className="text-xs text-muted-foreground">Was this helpful?</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => handle(true)}
        aria-label="Helpful"
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => handle(false)}
        aria-label="Not helpful"
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
