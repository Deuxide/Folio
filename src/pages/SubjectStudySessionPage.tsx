import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ResumeSessionDialog } from "@/features/study/components/ResumeSessionDialog";
import { StudySessionView } from "@/features/study/components/StudySessionView";
import { useSessionTimers } from "@/features/study/hooks/useSessionTimers";
import {
  sessionCompletePath,
  sessionSetupPath,
} from "@/features/study/sessionPaths";
import { virtualSubjectSet } from "@/features/study/subjectPool";
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
import type { QuestionSet } from "@/types/question";
import type { StudySession } from "@/types/session";

export function SubjectStudySessionPage() {
  const { subjectKey: rawKey } = useParams();
  const subjectKey = rawKey ? decodeURIComponent(rawKey) : "";
  const navigate = useNavigate();
  const { session, pendingResume } = useStudySessionState();
  const [isHydrating, setIsHydrating] = useState(true);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const memory = getSessionState();
      if (
        memory.session?.subjectKey === subjectKey &&
        memory.session.status === "in_progress" &&
        !memory.pendingResume
      ) {
        setIsHydrating(false);
        return;
      }

      try {
        const persisted =
          await SessionRepository.getInProgressBySubjectKey(subjectKey);
        if (cancelled) {
          return;
        }
        if (!persisted) {
          void navigate(`/subjects/${encodeURIComponent(subjectKey)}/setup`, {
            replace: true,
          });
          return;
        }
        if (isDeadlinePassed(persisted.sessionDeadline)) {
          loadSession(persisted, { pendingResume: false });
          completeStudySession("session_timer");
          void navigate(sessionCompletePath(persisted), { replace: true });
          return;
        }
        loadSession(persisted, { pendingResume: true });
        setIsHydrating(false);
      } catch (cause) {
        if (!cancelled) {
          setHydrateError(
            cause instanceof Error
              ? cause.message
              : "Unable to restore the subject test.",
          );
          setIsHydrating(false);
        }
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [navigate, subjectKey]);

  const questionSet = useMemo((): QuestionSet | null => {
    if (!session || session.subjectKey !== subjectKey) {
      return null;
    }
    return virtualSubjectSet(
      subjectKey,
      session.subjectName ?? session.questionSetTitle,
      Object.values(session.questionSnapshots ?? {}),
    );
  }, [session, subjectKey]);

  async function handleDiscard() {
    await discardStudySession();
    void navigate(sessionSetupPath({
      ...(session as StudySession),
      subjectKey,
      kind: "subject",
    }), { replace: true });
  }

  if (isHydrating) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
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

  if (!session || session.subjectKey !== subjectKey || !questionSet) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" className="-ml-2 w-fit">
          <Link to="/statistics">
            <ArrowLeft />
            Back to statistics
          </Link>
        </Button>
        <Alert>
          <AlertTitle>No active subject test</AlertTitle>
          <AlertDescription>
            Start a new test from the statistics page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (pendingResume && session.status === "in_progress") {
    return (
      <>
        <ResumeExpiryWatcher session={session} />
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

function ResumeExpiryWatcher({ session }: { session: StudySession }) {
  const navigate = useNavigate();
  useSessionTimers(session, {
    enabled: session.status === "in_progress",
    onSessionExpired: () => {
      expireSessionIfNeeded();
      void navigate(sessionCompletePath(session), { replace: true });
    },
    onQuestionExpired: () => undefined,
  });
  return null;
}
