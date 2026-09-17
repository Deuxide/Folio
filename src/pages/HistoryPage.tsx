import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteSessionDialog } from "@/features/history/components/DeleteSessionDialog";
import { formatHistoryDate } from "@/features/history/formatDate";
import { sessionAccuracy } from "@/features/statistics/computeStatistics";
import {
  clearStudySession,
  getSessionState,
} from "@/features/study/sessionStore";
import { isSubjectSession } from "@/features/study/sessionPaths";
import { formatCountdown } from "@/features/study/timer";
import { SessionRepository } from "@/repositories/SessionRepository";
import type { StudySession } from "@/types/session";

export function HistoryPage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<StudySession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const completed = await SessionRepository.getCompleted();
      if (!cancelled) {
        setSessions(completed);
        setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await SessionRepository.delete(pendingDelete.id);
      const loaded = getSessionState().session;
      if (loaded?.id === pendingDelete.id) {
        clearStudySession();
      }
      setSessions((current) =>
        current.filter((session) => session.id !== pendingDelete.id),
      );
      setPendingDelete(null);
    } catch (cause) {
      setDeleteError(
        cause instanceof Error
          ? cause.message
          : "Unable to delete this session.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium tracking-wide text-primary uppercase">
          Progress
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          Study History
        </h1>
      </header>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      ) : sessions.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
          <h2 className="font-serif text-2xl font-semibold">No study history yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Complete a study session to start building your history.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Go to question sets</Link>
          </Button>
        </section>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => {
            const accuracy = sessionAccuracy(session);
            const duration =
              session.completedAt && session.startedAt
                ? Date.parse(session.completedAt) - Date.parse(session.startedAt)
                : null;
            return (
              <li key={session.id}>
                <div className="flex items-stretch gap-1 rounded-2xl border border-border bg-card">
                  <Link
                    to={`/sessions/${session.id}`}
                    className="min-w-0 flex-1 px-5 py-4 transition-colors hover:bg-accent/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-serif text-xl font-semibold">
                          {session.questionSetTitle}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatHistoryDate(
                            session.completedAt ?? session.startedAt,
                          )}
                        </p>
                      </div>
                      <p className="text-sm font-medium">
                        {accuracy.percent === null ? "—" : `${accuracy.percent}%`}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {isSubjectSession(session)
                        ? `${session.sourceSetIds?.length ?? 0} ${(session.sourceSetIds?.length ?? 0) === 1 ? "question bank" : "question banks"} · `
                        : ""}
                      {session.questionIds.length}{" "}
                      {session.questionIds.length === 1
                        ? "question"
                        : "questions"}
                      {duration && duration > 0
                        ? ` · ${formatCountdown(duration)}`
                        : ""}
                    </p>
                  </Link>
                  <div className="flex items-start p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete session for ${session.questionSetTitle}`}
                      onClick={() => {
                        setDeleteError(null);
                        setPendingDelete(session);
                      }}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DeleteSessionDialog
        open={pendingDelete !== null}
        title={pendingDelete?.questionSetTitle}
        isDeleting={isDeleting}
        error={deleteError}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setPendingDelete(null);
            setDeleteError(null);
          }
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </div>
  );
}
