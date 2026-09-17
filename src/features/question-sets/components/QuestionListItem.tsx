import { Badge } from "@/components/ui/badge";
import { QuestionAttemptHistory } from "@/features/history/components/QuestionAttemptHistory";
import type { QuestionHistoryEntry } from "@/features/history/extractAttempts";
import { formatDifficulty } from "@/features/questions/difficulty";
import { formatQuestionType } from "@/features/question-sets/utils/formatQuestionType";
import type { Question } from "@/types/question";

type QuestionListItemProps = {
  index: number;
  question: Question;
  history?: QuestionHistoryEntry[];
};

export function QuestionListItem({
  index,
  question,
  history = [],
}: QuestionListItemProps) {
  const meta = [question.subject, question.topic].filter(Boolean).join(" • ");
  const last = history[0];

  return (
    <article className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-b border-border py-5 last:border-b-0">
      <div className="pt-0.5 font-serif text-lg font-semibold text-muted-foreground tabular-nums">
        {index + 1}
      </div>
      <div className="min-w-0">
        <p className="text-base leading-relaxed text-foreground">
          {question.question}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{formatQuestionType(question.type)}</Badge>
          {question.difficulty ? (
            <Badge variant="outline">{formatDifficulty(question.difficulty)}</Badge>
          ) : null}
          {meta ? (
            <span className="text-sm text-muted-foreground">{meta}</span>
          ) : null}
          {last ? (
            <span className="text-sm text-muted-foreground">
              {last.result === "correct"
                ? "Last: correct"
                : last.result === "incorrect"
                  ? "Last: incorrect"
                  : last.result === "unanswered"
                    ? "Last: unanswered"
                    : "Last: ungraded"}
              {` · ${history.length} ${history.length === 1 ? "attempt" : "attempts"}`}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Not attempted</span>
          )}
        </div>
        {history.length > 0 ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              View attempt history
            </summary>
            <div className="mt-2">
              <QuestionAttemptHistory history={history} />
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}
