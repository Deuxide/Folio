import { Badge } from "@/components/ui/badge";
import {
  formatAnswerValue,
  formatCorrectAnswer,
} from "@/features/grading/formatAnswer";
import { confidenceLabel } from "@/features/study/confidenceLabels";
import { MathText } from "@/features/questions/components/MathText";
import type { GradingStatus } from "@/types/grading";
import type { Question } from "@/types/question";
import type { QuestionAttempt } from "@/types/session";

type LearnFeedbackPanelProps = {
  question: Question;
  attempt: QuestionAttempt;
};

const STATUS_BADGE: Record<GradingStatus, { label: string; variant: "default" | "outline" | "secondary" }> = {
  correct: { label: "✓ Correct", variant: "default" },
  incorrect: { label: "✗ Incorrect", variant: "outline" },
  ungraded: { label: "Not automatically graded", variant: "secondary" },
  unanswered: { label: "Not answered", variant: "secondary" },
};

/**
 * Post-answer feedback for Learn mode: the recorded outcome, the user's
 * answer next to the correct answer, and the question's explanation.
 * Rendered in place of (not next to) the answer input, so the answer can no
 * longer be edited once the outcome is recorded.
 */
export function LearnFeedbackPanel({
  question,
  attempt,
}: LearnFeedbackPanelProps) {
  const userLabel = formatAnswerValue(question, attempt.userAnswer) ?? "—";
  const correctLabel = formatCorrectAnswer(question);
  const hasOutcome = attempt.result !== undefined;
  const status: GradingStatus = attempt.result ?? "unanswered";
  const badge = STATUS_BADGE[status];
  const credit =
    typeof attempt.partialCredit === "number" && attempt.partialCredit > 0
      ? attempt.partialCredit
      : undefined;

  return (
    <section
      aria-label="Answer feedback"
      className={
        status === "correct"
          ? "space-y-4 rounded-xl border border-primary/40 bg-primary/5 p-4"
          : status === "incorrect"
            ? "space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
            : "space-y-4 rounded-xl border border-border bg-muted/40 p-4"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        {credit !== undefined && status === "incorrect" ? (
          <Badge variant="outline">
            Partial credit: {Math.round(credit * 100)}%
          </Badge>
        ) : null}
        {attempt.timedOut ? <Badge variant="outline">Timed out</Badge> : null}
        {attempt.confidence ? (
          <Badge variant="secondary">
            {confidenceLabel(attempt.confidence)}
          </Badge>
        ) : null}
      </div>

      {hasOutcome ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Your answer</dt>
            <dd className="mt-0.5 font-medium">
              <MathText text={userLabel} />
            </dd>
          </div>
          {status !== "ungraded" && correctLabel ? (
            <div>
              <dt className="text-muted-foreground">Correct answer</dt>
              <dd className="mt-0.5 font-medium">
                <MathText text={correctLabel} />
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">
          Time ran out before the answer was checked.
        </p>
      )}

      {question.explanation ? (
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Explanation
          </p>
          <MathText
            as="p"
            className="mt-1 text-sm leading-relaxed"
            text={question.explanation}
          />
        </div>
      ) : null}
    </section>
  );
}
