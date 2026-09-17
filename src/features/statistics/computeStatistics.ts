import {
  extractHistoryEntries,
  getAttemptResult,
  type QuestionHistoryEntry,
} from "@/features/history/extractAttempts";
import type { Question } from "@/types/question";
import type { StudySession } from "@/types/session";

export type AccuracyStats = {
  correct: number;
  incorrect: number;
  percent: number | null;
  attempted: number;
};

export type GroupStats = AccuracyStats & {
  name: string;
};

export type TimeStats = {
  averageMs: number | null;
  fastestMs: number | null;
  slowestMs: number | null;
};

export type SessionTrendPoint = {
  sessionId: string;
  title: string;
  completedAt: string;
  accuracyPercent: number | null;
  averageTimeMs: number | null;
  questionCount: number;
};

export type SetOverviewStats = {
  questionCount: number;
  questionsAttempted: number;
  sessions: number;
  accuracy: AccuracyStats;
  averageTimeMs: number | null;
  lastStudiedAt?: string;
};

function accuracyFrom(correct: number, incorrect: number): AccuracyStats {
  const graded = correct + incorrect;
  return {
    correct,
    incorrect,
    attempted: graded,
    percent: graded > 0 ? Math.round((correct / graded) * 100) : null,
  };
}

export function sessionAccuracy(session: StudySession): AccuracyStats {
  let correct = 0;
  let incorrect = 0;
  for (const questionId of session.questionIds) {
    const question = session.questionSnapshots?.[questionId];
    const result = getAttemptResult(session, questionId, question);
    if (result === "correct") {
      correct += 1;
    } else if (result === "incorrect") {
      incorrect += 1;
    }
  }
  return accuracyFrom(correct, incorrect);
}

export function computeTimeStats(entries: QuestionHistoryEntry[]): TimeStats {
  const times = entries
    .map((entry) => entry.timeSpentMs)
    .filter((value): value is number => typeof value === "number");
  if (times.length === 0) {
    return { averageMs: null, fastestMs: null, slowestMs: null };
  }
  const total = times.reduce((sum, value) => sum + value, 0);
  return {
    averageMs: Math.round(total / times.length),
    fastestMs: Math.min(...times),
    slowestMs: Math.max(...times),
  };
}

export function computeGroupStats(
  entries: QuestionHistoryEntry[],
  sessions: StudySession[],
  getName: (questionId: string) => string | undefined,
): GroupStats[] {
  const groups = new Map<string, { correct: number; incorrect: number }>();

  for (const entry of entries) {
    const name = getName(entry.questionId);
    if (!name) {
      continue;
    }
    const current = groups.get(name) ?? { correct: 0, incorrect: 0 };
    if (entry.result === "correct") {
      current.correct += 1;
    } else if (entry.result === "incorrect") {
      current.incorrect += 1;
    }
    groups.set(name, current);
  }

  void sessions;

  return [...groups.entries()]
    .map(([name, counts]) => ({
      name,
      ...accuracyFrom(counts.correct, counts.incorrect),
    }))
    .filter((group) => group.attempted > 0)
    .sort((left, right) => (left.percent ?? 0) - (right.percent ?? 0));
}

export function computeDifficultyStats(entries: QuestionHistoryEntry[]) {
  return (["easy", "medium", "hard"] as const).map((rating) => {
    const rated = entries.filter((entry) => entry.difficulty === rating);
    const correct = rated.filter((entry) => entry.result === "correct").length;
    const incorrect = rated.filter((entry) => entry.result === "incorrect").length;
    return {
      rating,
      total: rated.length,
      ...accuracyFrom(correct, incorrect),
    };
  });
}

export function computeSessionTrends(sessions: StudySession[]): SessionTrendPoint[] {
  return sessions
    .filter((session) => session.status === "completed")
    .sort((left, right) =>
      (left.completedAt ?? left.startedAt).localeCompare(
        right.completedAt ?? right.startedAt,
      ),
    )
    .map((session) => {
      const accuracy = sessionAccuracy(session);
      const times = session.questionIds
        .map((questionId) => session.attempts[questionId]?.timeSpentMs)
        .filter((value): value is number => typeof value === "number");
      return {
        sessionId: session.id,
        title: session.questionSetTitle,
        completedAt: session.completedAt ?? session.startedAt,
        accuracyPercent: accuracy.percent,
        averageTimeMs:
          times.length > 0
            ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length)
            : null,
        questionCount: session.questionIds.length,
      };
    });
}

export function computeSetOverview(
  questionCount: number,
  sessions: StudySession[],
): SetOverviewStats {
  const completed = sessions.filter((session) => session.status === "completed");
  const entries = extractHistoryEntries(completed);
  const attemptedIds = new Set(entries.map((entry) => entry.questionId));
  const correct = entries.filter((entry) => entry.result === "correct").length;
  const incorrect = entries.filter((entry) => entry.result === "incorrect").length;
  const times = computeTimeStats(entries);
  const last = completed
    .map((session) => session.completedAt ?? session.startedAt)
    .sort()
    .at(-1);

  const overview: SetOverviewStats = {
    questionCount,
    questionsAttempted: attemptedIds.size,
    sessions: completed.length,
    accuracy: accuracyFrom(correct, incorrect),
    averageTimeMs: times.averageMs,
  };
  if (last) {
    overview.lastStudiedAt = last;
  }
  return overview;
}

export function lookupQuestionMeta(
  questions: Question[],
  sessions: StudySession[],
): Map<string, Question> {
  const map = new Map<string, Question>();
  for (const session of sessions) {
    for (const question of Object.values(session.questionSnapshots ?? {})) {
      map.set(question.id, question);
    }
  }
  for (const question of questions) {
    if (!map.has(question.id)) {
      map.set(question.id, question);
    }
  }
  return map;
}
