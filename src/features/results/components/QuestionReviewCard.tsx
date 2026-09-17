import { QuestionImages } from "@/features/questions/components/QuestionImages";
import { getQuestionImages } from "@/features/questions/media";
import {
  formatAnswerValue,
  formatCorrectAnswer,
} from "@/features/grading/formatAnswer";
import { QuestionAttemptHistory } from "@/features/history/components/QuestionAttemptHistory";
import type { QuestionHistoryEntry } from "@/features/history/extractAttempts";
import type { ReviewedQuestion } from "@/features/grading/summarizeSession";
import { formatCountdown } from "@/features/study/timer";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<ReviewedQuestion["status"], string> = {
  correct: "Correct",
  incorrect: "Incorrect",
  unanswered: "Unanswered",
  ungraded: "Not automatically graded",
};

const DIFFICULTY_LABEL = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

type QuestionReviewCardProps = {
  review: ReviewedQuestion;
  history?: QuestionHistoryEntry[];
  sourceLabel?: string;
};

export function QuestionReviewCard({
  review,
  history = [],
  sourceLabel,
}: QuestionReviewCardProps) {
  const question = review.question;
  const userLabel = question
    ? formatAnswerValue(question, review.userAnswer)
    : undefined;
  const correctLabel = question ? formatCorrectAnswer(question) : undefined;

  return (
    <article
      className={
        review.status === "correct"
          ? "space-y-4 rounded-2xl border border-primary/30 bg-card p-5"
          : review.status === "incorrect"
            ? "space-y-4 rounded-2xl border border-destructive/30 bg-card p-5"
            : "space-y-4 rounded-2xl border border-border bg-card p-5"
      }
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg font-semibold">
            Question {review.index + 1}
          </h3>
          {sourceLabel ? (
            <p className="mt-1 text-sm text-muted-foreground">{sourceLabel}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={
              review.status === "correct"
                ? "default"
                : review.status === "incorrect"
                  ? "outline"
                  : "secondary"
            }
          >
            {review.status === "correct"
              ? "✓ Correct"
              : review.status === "incorrect"
                ? "✗ Incorrect"
                : STATUS_LABEL[review.status]}
          </Badge>
          {review.timedOut ? <Badge variant="outline">Timed out</Badge> : null}
        </div>
      </header>

      {question ? (
        <>
          <p className="text-base leading-relaxed">{question.question}</p>
          <QuestionImages images={getQuestionImages(question)} size="compact" />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          This question is no longer in the question set.
        </p>
      )}

      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Your answer</dt>
          <dd className="mt-0.5 font-medium">
            {userLabel ?? "Not answered"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Correct answer</dt>
          <dd className="mt-0.5 font-medium">
            {correctLabel ?? "Not provided"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Difficulty</dt>
          <dd className="mt-0.5 font-medium">
            {review.difficulty ? DIFFICULTY_LABEL[review.difficulty] : "Not rated"}
          </dd>
        </div>
        {typeof review.timeSpentMs === "number" ? (
          <div>
            <dt className="text-muted-foreground">Time spent</dt>
            <dd className="mt-0.5 font-medium">
              {formatCountdown(review.timeSpentMs)}
            </dd>
          </div>
        ) : null}
      </dl>

      {question?.explanation ? (
        <div>
          <p className="text-sm text-muted-foreground">Explanation</p>
          <p className="mt-1 text-sm leading-relaxed">{question.explanation}</p>
        </div>
      ) : null}

      <QuestionAttemptHistory history={history} />
    </article>
  );
}
