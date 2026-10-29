import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { QuestionHistoryEntry } from "@/features/history/extractAttempts";
import { summarizeSession } from "@/features/grading/summarizeSession";
import { QuestionReviewCard } from "@/features/results/components/QuestionReviewCard";
import {
  ReviewFilters,
  type ResultFilter,
} from "@/features/results/components/ReviewFilters";
import { sessionAccuracy } from "@/features/statistics/computeStatistics";
import {
  isSubjectSession,
  questionSourceLabel,
  sessionSetupPath,
  sessionStudyPath,
} from "@/features/study/sessionPaths";
import { clearStudySession } from "@/features/study/sessionStore";
import {
  getMissedQuestionIds,
  startRetrySession,
} from "@/features/study/retrySession";
import { formatCountdown } from "@/features/study/timer";
import type { Question } from "@/types/question";
import type { DifficultyRating, StudySession } from "@/types/session";

type SessionResultsViewProps = {
  session: StudySession;
  questions: Question[];
  history?: QuestionHistoryEntry[];
  title?: string;
  onSelfGrade?: (questionId: string, grade: "correct" | "incorrect") => void;
};

export function SessionResultsView({
  session,
  questions,
  history = [],
  title = "Session Complete",
  onSelfGrade,
}: SessionResultsViewProps) {
  const navigate = useNavigate();
  const [resultFilters, setResultFilters] = useState<ResultFilter[]>([]);
  const [difficultyFilters, setDifficultyFilters] = useState<DifficultyRating[]>(
    [],
  );
  const [conflictOpen, setConflictOpen] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [isStartingRetry, setIsStartingRetry] = useState(false);
  const summary = useMemo(
    () => summarizeSession(session, questions),
    [questions, session],
  );
  const missedCount = useMemo(
    () => getMissedQuestionIds(session).length,
    [session],
  );

  async function handlePracticeMissed(discardActive: boolean) {
    setRetryError(null);
    setIsStartingRetry(true);
    try {
      const result = await startRetrySession(session, { discardActive });
      if (result.ok) {
        void navigate(sessionStudyPath(session));
        return;
      }
      if (result.reason === "conflict") {
        setConflictOpen(true);
        return;
      }
      setRetryError(
        "There is nothing to practice yet: this session has no missed questions.",
      );
    } catch (cause) {
      setRetryError(
        cause instanceof Error
          ? cause.message
          : "Unable to start the practice session.",
      );
    } finally {
      setIsStartingRetry(false);
    }
  }

  const visibleReviews = summary.reviews.filter((review) => {
    if (resultFilters.length > 0) {
      const statusMatch = resultFilters.some((filter) => {
        if (filter === "timedOut") {
          return review.timedOut;
        }
        return review.status === filter;
      });
      if (!statusMatch) {
        return false;
      }
    }
    if (difficultyFilters.length > 0) {
      if (!review.difficulty || !difficultyFilters.includes(review.difficulty)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <section className="rounded-2xl border border-border bg-card px-6 py-8">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 size-7 text-primary" aria-hidden="true" />
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              {session.questionSetTitle}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.total} {summary.total === 1 ? "Question" : "Questions"}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <Stat label="Correct" value={summary.correct} />
          <Stat label="Incorrect" value={summary.incorrect} />
          <Stat label="Unanswered" value={summary.unanswered} />
          <Stat label="Timed out" value={summary.timedOut} />
          <Stat label="Not automatically graded" value={summary.ungraded} />
        </dl>

        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <p>
            <span className="text-muted-foreground">Accuracy: </span>
            <span className="font-medium">
              {summary.accuracyPercent === null
                ? "Not enough graded answers"
                : `${summary.accuracyPercent}%`}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Total time: </span>
            <span className="font-medium">
              {summary.totalTimeMs === null
                ? "—"
                : formatCountdown(summary.totalTimeMs)}
            </span>
          </p>
        </div>

        {isSubjectSession(session) && session.sourceSetIds ? (
          <div className="mt-6">
            <h2 className="font-medium">By question bank</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {session.sourceSetIds.map((setId) => {
                const title = session.sourceSetTitles?.[setId] ?? "Question bank";
                const questionIds = session.questionIds.filter(
                  (questionId) => session.questionSourceSetIds?.[questionId] === setId,
                );
                if (questionIds.length === 0) {
                  return null;
                }
                const subset = {
                  ...session,
                  questionIds,
                };
                const accuracy = sessionAccuracy(subset);
                return (
                  <li
                    key={setId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <span>{title}</span>
                    <span className="text-muted-foreground">
                      {accuracy.percent === null ? "—" : `${accuracy.percent}%`}
                      {` · ${questionIds.length} ${questionIds.length === 1 ? "question" : "questions"}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="mt-6">
          <h2 className="font-medium">Difficulty</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.difficulty.map((item) => {
              const graded = item.correct + item.incorrect;
              return (
                <li
                  key={item.rating}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <span className="capitalize">{item.rating}</span>
                  <span className="text-muted-foreground">
                    {item.total} {item.total === 1 ? "question" : "questions"}
                    {graded > 0 ? ` · ${item.correct} / ${graded} correct` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {missedCount > 0 ? (
            <Button
              type="button"
              onClick={() => {
                void handlePracticeMissed(false);
              }}
              disabled={isStartingRetry}
            >
              <RotateCcw />
              {isStartingRetry
                ? "Starting…"
                : `Practice missed (${missedCount})`}
            </Button>
          ) : null}
          <Button asChild>
            <a href="#review">Review Questions</a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/history">Study History</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link
              to={sessionSetupPath(session)}
              onClick={() => clearStudySession()}
            >
              Study again
            </Link>
          </Button>
        </div>
        {retryError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {retryError}
          </p>
        ) : null}
      </section>

      <section id="review" className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">
            Review Questions
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Combine result and difficulty filters to narrow the list.
          </p>
        </div>
        <ReviewFilters
          resultFilters={resultFilters}
          difficultyFilters={difficultyFilters}
          onToggleResult={(filter) =>
            setResultFilters((current) =>
              current.includes(filter)
                ? current.filter((item) => item !== filter)
                : [...current, filter],
            )
          }
          onToggleDifficulty={(filter) =>
            setDifficultyFilters((current) =>
              current.includes(filter)
                ? current.filter((item) => item !== filter)
                : [...current, filter],
            )
          }
        />
        {visibleReviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No questions match these filters.
          </p>
        ) : (
          <div className="space-y-4">
            {visibleReviews.map((review) => (
              <QuestionReviewCard
                key={review.questionId}
                review={review}
                sourceLabel={questionSourceLabel(session, review.questionId)}
                history={history.filter(
                  (entry) => entry.questionId === review.questionId,
                )}
                onSelfGrade={
                  onSelfGrade
                    ? (grade) => onSelfGrade(review.questionId, grade)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

      <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your unfinished session?</AlertDialogTitle>
            <AlertDialogDescription>
              There is an unfinished session with progress saved on this
              device. Starting the missed-questions practice discards it —
              answers that were already given are removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConflictOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConflictOpen(false);
                void handlePracticeMissed(true);
              }}
            >
              Discard and practice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-serif text-2xl font-semibold">{value}</dd>
    </div>
  );
}
