import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useQuestionSet } from "@/features/question-sets/hooks/useQuestionSet";
import { extractHistoryEntries } from "@/features/history/extractAttempts";
import { getPracticePool } from "@/features/statistics/practicePool";
import { SessionSetupForm } from "@/features/study/components/SessionSetupForm";
import { startStudySession } from "@/features/study/sessionStore";
import { SessionRepository } from "@/repositories/SessionRepository";
import type { PracticeFocus, SessionConfiguration } from "@/types/session";
import type { StudySession } from "@/types/session";

export function SessionSetupPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { questionSet, isLoading, error } = useQuestionSet(id);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      if (!id) {
        return;
      }
      const completed = (await SessionRepository.getByQuestionSetId(id)).filter(
        (session) => session.status === "completed",
      );
      if (!cancelled) {
        setSessions(completed);
      }
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const history = useMemo(() => extractHistoryEntries(sessions), [sessions]);
  const practiceCounts = useMemo(() => {
    if (!questionSet) {
      return undefined;
    }
    const focuses: PracticeFocus[] = [
      "all",
      "unanswered",
      "incorrect",
      "hard",
      "weak",
    ];
    return Object.fromEntries(
      focuses.map((focus) => [
        focus,
        getPracticePool(questionSet.questions, focus, history).length,
      ]),
    ) as Record<PracticeFocus, number>;
  }, [history, questionSet]);

  async function handleStart(configuration: SessionConfiguration) {
    if (!questionSet) {
      return;
    }
    const pool = getPracticePool(
      questionSet.questions,
      configuration.practiceFocus,
      history,
    );
    setIsStarting(true);
    setStartError(null);
    try {
      await startStudySession(questionSet, configuration, pool);
      void navigate(`/sets/${questionSet.id}/study`);
    } catch (cause) {
      setStartError(
        cause instanceof Error
          ? cause.message
          : "Unable to start the study session.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <Button asChild variant="ghost" className="-ml-2 w-fit">
        <Link to={id ? `/sets/${id}` : "/"}>
          <ArrowLeft />
          Back to question set
        </Link>
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      ) : error || !questionSet ? (
        <Alert variant="destructive">
          <AlertTitle>Question set unavailable</AlertTitle>
          <AlertDescription>
            {error ?? "This question set could not be found on this device."}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <header className="space-y-2">
            <p className="text-sm font-medium tracking-wide text-primary uppercase">
              Session setup
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {questionSet.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose how this practice session should run. You can start with
              the defaults if you just want to begin.
            </p>
          </header>
          {startError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to start</AlertTitle>
              <AlertDescription>{startError}</AlertDescription>
            </Alert>
          ) : null}
          <SessionSetupForm
            availableCount={questionSet.questions.length}
            practiceCounts={practiceCounts}
            isStarting={isStarting}
            onStart={handleStart}
          />
        </>
      )}
    </div>
  );
}
