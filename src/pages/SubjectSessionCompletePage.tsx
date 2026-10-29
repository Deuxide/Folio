import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { extractHistoryEntries } from "@/features/history/extractAttempts";
import { SessionResultsView } from "@/features/results/components/SessionResultsView";
import { loadSession, setSelfGrading, useStudySessionState } from "@/features/study/sessionStore";
import { SessionRepository } from "@/repositories/SessionRepository";
import type { StudySession } from "@/types/session";

export function SubjectSessionCompletePage() {
  const { subjectKey: rawKey } = useParams();
  const subjectKey = rawKey ? decodeURIComponent(rawKey) : "";
  const { session } = useStudySessionState();
  const [isLoading, setIsLoading] = useState(
    !session || session.status !== "completed" || session.subjectKey !== subjectKey,
  );
  const [missing, setMissing] = useState(false);
  const [historySessions, setHistorySessions] = useState<StudySession[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (
        session &&
        session.subjectKey === subjectKey &&
        session.status === "completed"
      ) {
        setIsLoading(false);
      } else {
        const completed =
          await SessionRepository.getCompletedBySubjectKey(subjectKey);
        const latest = completed[0];
        if (cancelled) {
          return;
        }
        if (latest) {
          loadSession(latest, { pendingResume: false });
          setIsLoading(false);
        } else {
          setMissing(true);
          setIsLoading(false);
          return;
        }
      }
      const related =
        await SessionRepository.getCompletedBySubjectKey(subjectKey);
      if (!cancelled) {
        setHistorySessions(related);
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [session, subjectKey]);

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

  if (missing || !session || session.subjectKey !== subjectKey) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card px-6 py-12 text-center">
        <h1 className="font-serif text-2xl font-semibold">No saved session</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          There is no completed subject test to show.
        </p>
        <Button asChild className="mt-6">
          <Link to="/statistics">Back to statistics</Link>
        </Button>
      </div>
    );
  }

  return (
    <SessionResultsView
      session={session}
      questions={Object.values(session.questionSnapshots ?? {})}
      history={history}
      title={`${session.subjectName ?? "Subject"} Test`}
      onSelfGrade={(questionId, selfGrading) => {
        setSelfGrading(questionId, selfGrading);
      }}
    />
  );
}
