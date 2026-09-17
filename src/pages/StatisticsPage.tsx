import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { extractHistoryEntries } from "@/features/history/extractAttempts";
import { formatHistoryDate } from "@/features/history/formatDate";
import {
  computeDifficultyStats,
  computeGroupStats,
  computeSessionTrends,
  computeSetOverview,
  computeTimeStats,
  lookupQuestionMeta,
} from "@/features/statistics/computeStatistics";
import { formatDifficultyAverage } from "@/features/statistics/difficultySummary";
import { computeSubjectStatistics } from "@/features/statistics/subjectStatistics";
import { findWeakQuestions } from "@/features/statistics/weakQuestions";
import { formatCountdown } from "@/features/study/timer";
import { QuestionSetRepository } from "@/repositories/QuestionSetRepository";
import { SessionRepository } from "@/repositories/SessionRepository";
import type { QuestionSet } from "@/types/question";
import type { StudySession } from "@/types/session";

export function StatisticsPage() {
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [allSets, completed] = await Promise.all([
        QuestionSetRepository.getAll(),
        SessionRepository.getCompleted(),
      ]);
      if (!cancelled) {
        setSets(allSets);
        setSessions(completed);
        setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const questions = useMemo(
    () => sets.flatMap((set) => set.questions),
    [sets],
  );
  const entries = useMemo(() => extractHistoryEntries(sessions), [sessions]);
  const meta = useMemo(
    () => lookupQuestionMeta(questions, sessions),
    [questions, sessions],
  );
  const overview = useMemo(
    () => computeSetOverview(questions.length, sessions),
    [questions.length, sessions],
  );
  const subjects = useMemo(
    () => computeSubjectStatistics(sets, sessions),
    [sessions, sets],
  );
  const topics = useMemo(
    () =>
      computeGroupStats(entries, sessions, (questionId) => {
        const question = meta.get(questionId);
        if (!question?.topic) {
          return undefined;
        }
        return question.subject
          ? `${question.subject}: ${question.topic}`
          : question.topic;
      }),
    [entries, meta, sessions],
  );
  const difficulty = useMemo(() => computeDifficultyStats(entries), [entries]);
  const times = useMemo(() => computeTimeStats(entries), [entries]);
  const trends = useMemo(() => computeSessionTrends(sessions), [sessions]);
  const weak = useMemo(() => findWeakQuestions(entries).slice(0, 8), [entries]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium tracking-wide text-primary uppercase">
          Progress
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          Statistics
        </h1>
      </header>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      ) : sessions.length === 0 && sets.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
          <h2 className="font-serif text-2xl font-semibold">No statistics yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Complete a study session to start building your performance history.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Go to question sets</Link>
          </Button>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Overall accuracy"
              value={
                overview.accuracy.percent === null
                  ? "—"
                  : `${overview.accuracy.percent}%`
              }
            />
            <StatCard label="Sessions" value={String(overview.sessions)} />
            <StatCard
              label="Questions attempted"
              value={String(overview.questionsAttempted)}
            />
            <StatCard
              label="Average time"
              value={
                times.averageMs === null ? "—" : formatCountdown(times.averageMs)
              }
            />
          </section>

          {times.fastestMs !== null && times.slowestMs !== null ? (
            <p className="text-sm text-muted-foreground">
              Fastest {formatCountdown(times.fastestMs)} · Slowest{" "}
              {formatCountdown(times.slowestMs)}
            </p>
          ) : null}

          {trends.length <= 1 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
              Complete a few sessions to see your accuracy trend.
            </p>
          ) : (
            <section className="space-y-3">
              <h2 className="font-serif text-2xl font-semibold">Progress over time</h2>
              <TrendList
                title="Accuracy"
                items={trends.map((point, index) => ({
                  label: `Session ${index + 1}`,
                  value:
                    point.accuracyPercent === null
                      ? "—"
                      : `${point.accuracyPercent}%`,
                  fill: point.accuracyPercent ?? 0,
                }))}
              />
              <TrendList
                title="Average time"
                items={trends.map((point, index) => ({
                  label: `Session ${index + 1}`,
                  value:
                    point.averageTimeMs === null
                      ? "—"
                      : formatCountdown(point.averageTimeMs),
                  fill:
                    point.averageTimeMs && times.slowestMs
                      ? Math.round((point.averageTimeMs / times.slowestMs) * 100)
                      : 0,
                }))}
              />
            </section>
          )}

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold">Difficulty performance</h2>
            <ul className="space-y-2">
              {difficulty.map((item) => (
                <li
                  key={item.rating}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm"
                >
                  <span className="capitalize">{item.rating}</span>
                  <span className="text-muted-foreground">
                    {item.total} rated
                    {item.percent !== null ? ` · ${item.percent}% correct` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {subjects.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-serif text-2xl font-semibold">Subjects</h2>
              <div className="space-y-3">
                {subjects.map((item) => (
                  <details
                    key={item.key}
                    className="rounded-2xl border border-border bg-card px-4 py-4"
                  >
                    <summary className="cursor-pointer">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="text-xs font-medium tracking-wide text-primary uppercase">
                          {item.name}
                        </p>
                        {item.questionCount > 0 ? (
                          <Button asChild size="sm" onClick={(event) => event.stopPropagation()}>
                            <Link
                              to={`/subjects/${encodeURIComponent(item.key)}/setup`}
                            >
                              Start Test
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                        <p>
                          Question banks:{" "}
                          <span className="font-medium">{item.bankCount}</span>
                        </p>
                        <p>
                          Questions:{" "}
                          <span className="font-medium">{item.questionCount}</span>
                        </p>
                        <p>
                          Accuracy:{" "}
                          <span className="font-medium">
                            {item.accuracy.percent === null
                              ? "Not enough graded answers"
                              : `${item.accuracy.percent}%`}
                          </span>
                        </p>
                        <p>
                          Average difficulty:{" "}
                          <span className="font-medium">
                            {formatDifficultyAverage(item.difficulty.average)}
                          </span>
                        </p>
                        <p>
                          Average time:{" "}
                          <span className="font-medium">
                            {item.averageTimeMs === null
                              ? "—"
                              : formatCountdown(item.averageTimeMs)}
                          </span>
                        </p>
                        <p>
                          Attempted:{" "}
                          <span className="font-medium">
                            {item.questionsAttempted}
                          </span>
                        </p>
                      </div>
                    </summary>
                    <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
                      <p className="text-muted-foreground">
                        Easy {item.difficulty.easy} · Medium {item.difficulty.medium}{" "}
                        · Hard {item.difficulty.hard}
                        {item.difficulty.unrated > 0
                          ? ` · Unrated ${item.difficulty.unrated}`
                          : ""}
                        {item.difficulty.average !== null
                          ? ` · ${item.difficulty.label}`
                          : ""}
                      </p>
                      {item.lastStudiedAt ? (
                        <p className="text-muted-foreground">
                          Last studied {formatHistoryDate(item.lastStudiedAt)} ·{" "}
                          {item.sessions}{" "}
                          {item.sessions === 1 ? "session" : "sessions"}
                        </p>
                      ) : (
                        <p className="text-muted-foreground">Not studied yet</p>
                      )}
                      <ul className="space-y-1">
                        {item.sets.map((set) => (
                          <li key={set.id}>
                            <Link
                              to={`/sets/${set.id}`}
                              className="text-foreground hover:underline"
                            >
                              {set.title}
                            </Link>
                            <span className="text-muted-foreground">
                              {" "}
                              · {set.questions.length} questions
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {topics.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-serif text-2xl font-semibold">Topics</h2>
              <ul className="space-y-2">
                {topics.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm"
                  >
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">{item.percent}%</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {weak.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-serif text-2xl font-semibold">Needs practice</h2>
              <ul className="space-y-2">
                {weak.map((item) => {
                  const question = meta.get(item.questionId);
                  return (
                    <li
                      key={item.questionId}
                      className="rounded-xl border border-border px-4 py-3"
                    >
                      <p className="font-medium">
                        {question?.question ?? "Question no longer in the set"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.reasons.join(" · ")}
                        {item.averageTimeMs
                          ? ` · Average time ${formatCountdown(item.averageTimeMs)}`
                          : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold">Question sets</h2>
            <ul className="space-y-2">
              {sets.map((set) => {
                const setSessions = sessions.filter(
                  (session) => session.questionSetId === set.id,
                );
                const setStats = computeSetOverview(
                  set.questions.length,
                  setSessions,
                );
                return (
                  <li key={set.id}>
                    <Link
                      to={`/sets/${set.id}`}
                      className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm hover:bg-accent/40"
                    >
                      <span className="font-medium">{set.title}</span>
                      <span className="text-muted-foreground">
                        {setStats.sessions === 0
                          ? "Not studied yet"
                          : `${setStats.accuracy.percent ?? "—"}% · ${formatHistoryDate(setStats.lastStudiedAt ?? set.updatedAt)}`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold">{value}</p>
    </div>
  );
}

function TrendList({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string; fill: number }[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="font-medium">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{item.label}</span>
              <span className="tabular-nums text-muted-foreground">{item.value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(4, Math.min(item.fill, 100))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
