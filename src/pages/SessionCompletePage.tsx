import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuestionSet } from "@/features/question-sets/hooks/useQuestionSet";
import { extractHistoryEntries } from "@/features/history/extractAttempts";
import { SessionResultsView } from "@/features/results/components/SessionResultsView";
import { loadSession, setSelfGrading, useStudySessionState } from "@/features/study/sessionStore";
import { SessionRepository } from "@/repositories/SessionRepository";
import type { StudySession } from "@/types/session";

export function SessionCompletePage() {
  const { id } = useParams();
  const { session } = useStudySessionState();
  const { questionSet } = useQuestionSet(id);
  const [isLoading, setIsLoading] = useState(
    !session || session.status !== "completed",
  );
  const [missing, setMissing] = useState(false);
  const [historySessions, setHistorySessions] = useState<StudySession[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (session && session.questionSetId === id && session.status === "completed") {
        setIsLoading(false);
      } else if (!id) {
        setMissing(true);
        setIsLoading(false);
        return;
      } else {
        const latest = await SessionRepository.getLatestByQuestionSetId(id);
        if (cancelled) {
          return;
        }
        if (latest && latest.status === "completed") {
          loadSession(latest, { pendingResume: false });
          setIsLoading(false);
        } else {
          setMissing(true);
          setIsLoading(false);
          return;
        }
      }

      if (id) {
        const completed = (await SessionRepository.getByQuestionSetId(id)).filter(
          (item) => item.status === "completed",
        );
        if (!cancelled) {
          setHistorySessions(completed);
        }
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [id, session]);

  const history = useMemo(
    () => extractHistoryEntries(historySessions),
    [historySessions],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }

  if (missing || !session || session.questionSetId !== id) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card px-6 py-12 text-center">
        <h1 className="font-serif text-2xl font-semibold">No saved session</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          There is no completed session to show for this question set.
        </p>
        <Button asChild className="mt-6">
          <Link to={id ? `/sets/${id}` : "/"}>Back to question set</Link>
        </Button>
      </div>
    );
  }

  return (
    <SessionResultsView
      session={session}
      questions={questionSet?.questions ?? Object.values(session.questionSnapshots ?? {})}
      history={history}
      onSelfGrade={(questionId, selfGrading) => {
        // The completed session lives in the study store; the store action
        // updates the record and persists it to the repository.
        setSelfGrading(questionId, selfGrading);
      }}
    />
  );
}
