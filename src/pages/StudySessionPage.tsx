import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useQuestionSet } from "@/features/question-sets/hooks/useQuestionSet";
import { ResumeSessionDialog } from "@/features/study/components/ResumeSessionDialog";
import { StudySessionView } from "@/features/study/components/StudySessionView";
import { useSessionTimers } from "@/features/study/hooks/useSessionTimers";
import { isDeadlinePassed } from "@/features/study/timer";
import {
  acknowledgeResume,
  completeStudySession,
  discardStudySession,
  expireSessionIfNeeded,
  getSessionState,
  loadSession,
  useStudySessionState,
} from "@/features/study/sessionStore";
import { SessionRepository } from "@/repositories/SessionRepository";
import type { StudySession } from "@/types/session";

export function StudySessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { questionSet, isLoading, error } = useQuestionSet(id);
  const { session, pendingResume } = useStudySessionState();
  const [isHydrating, setIsHydrating] = useState(true);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!id) {
        return;
      }

      const memory = getSessionState();
      const memoryMatches =
        memory.session?.questionSetId === id &&
        memory.session.status === "in_progress";
      if (memoryMatches && !memory.pendingResume) {
        setIsHydrating(false);
        return;
      }

      setIsHydrating(true);
      setHydrateError(null);

      try {
        const persisted =
          await SessionRepository.getInProgressByQuestionSetId(id);
        if (cancelled) {
          return;
        }

        if (!persisted) {
          void navigate(`/sets/${id}/setup`, { replace: true });
          return;
        }

        if (isDeadlinePassed(persisted.sessionDeadline)) {
          loadSession(persisted, { pendingResume: false });
          completeStudySession("session_timer");
          void navigate(`/sets/${id}/complete`, { replace: true });
          return;
        }

        loadSession(persisted, { pendingResume: true });
        setIsHydrating(false);
      } catch (cause) {
        if (!cancelled) {
          setHydrateError(
            cause instanceof Error
              ? cause.message
              : "Unable to restore the study session.",
          );
          setIsHydrating(false);
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  async function handleDiscard() {
    await discardStudySession();
    if (id) {
      void navigate(`/sets/${id}/setup`, { replace: true });
    }
  }

  if (isLoading || isHydrating) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }

  if (error || !questionSet) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" className="-ml-2 w-fit">
          <Link to="/">
            <ArrowLeft />
            Back to question sets
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Question set unavailable</AlertTitle>
          <AlertDescription>
            {error ?? "This question set could not be found on this device."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (hydrateError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to open session</AlertTitle>
        <AlertDescription>{hydrateError}</AlertDescription>
      </Alert>
    );
  }

  if (!session || session.questionSetId !== questionSet.id) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }

  if (pendingResume && session.status === "in_progress") {
    return (
      <>
        <ResumeExpiryWatcher session={session} questionSetId={questionSet.id} />
        <ResumeSessionDialog
          open
          session={session}
          onResume={acknowledgeResume}
          onDiscard={() => {
            void handleDiscard();
          }}
        />
      </>
    );
  }

  return <StudySessionView questionSet={questionSet} session={session} />;
}

function ResumeExpiryWatcher({
  session,
  questionSetId,
}: {
  session: StudySession;
  questionSetId: string;
}) {
  const navigate = useNavigate();

  useSessionTimers(session, {
    enabled: session.status === "in_progress",
    onSessionExpired: () => {
      expireSessionIfNeeded();
      void navigate(`/sets/${questionSetId}/complete`, { replace: true });
    },
    onQuestionExpired: () => {
      // Per-question expiry waits until the user resumes answering.
    },
  });

  return null;
}
