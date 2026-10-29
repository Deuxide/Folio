import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { extractHistoryEntries } from "@/features/history/extractAttempts";
import { SessionResultsView } from "@/features/results/components/SessionResultsView";
import { withAttemptSelfGrading } from "@/features/grading/attemptOutcome";
import { SessionRepository } from "@/repositories/SessionRepository";
import { QuestionSetRepository } from "@/repositories/QuestionSetRepository";
import type { Question } from "@/types/question";
import type { StudySession } from "@/types/session";

export function SessionResultsPage() {
  const { sessionId } = useParams();
  const [session, setSession] = useState<StudySession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [historySessions, setHistorySessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gradeError, setGradeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }
      const stored = await SessionRepository.getById(sessionId);
      if (cancelled) {
        return;
      }
      if (!stored || stored.status !== "completed") {
        setSession(null);
        setIsLoading(false);
        return;
      }
      setSession(stored);
      const set = await QuestionSetRepository.getById(stored.questionSetId);
      const related = (
        await SessionRepository.getByQuestionSetId(stored.questionSetId)
      ).filter((item) => item.status === "completed");
      if (!cancelled) {
        setQuestions(set?.questions ?? Object.values(stored.questionSnapshots ?? {}));
        setHistorySessions(related);
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const history = useMemo(
    () => extractHistoryEntries(historySessions),
    [historySessions],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card px-6 py-12 text-center">
        <h1 className="font-serif text-2xl font-semibold">Session not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That study session is no longer available on this device.
        </p>
        <Button asChild className="mt-6">
          <Link to="/history">Back to history</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {gradeError ? (
        <Alert variant="destructive">
          <AlertTitle>Your grade was not saved</AlertTitle>
          <AlertDescription>{gradeError}</AlertDescription>
        </Alert>
      ) : null}
      <SessionResultsView
        session={session}
        questions={questions}
        history={history}
        title="Session results"
        onSelfGrade={(questionId, selfGrading) => {
          const next = withAttemptSelfGrading(session, questionId, selfGrading);
          void SessionRepository.save(next)
            .then(() => {
              setGradeError(null);
              setSession(next);
            })
            .catch((cause: unknown) => {
              setGradeError(
                cause instanceof Error
                  ? cause.message
                  : "Unable to save this grade on this device.",
              );
            });
        }}
      />
    </div>
  );
}
