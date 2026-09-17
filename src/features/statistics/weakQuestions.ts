import type { QuestionHistoryEntry } from "@/features/history/extractAttempts";

export type WeakQuestion = {
  questionId: string;
  score: number;
  reasons: string[];
  incorrectCount: number;
  hardCount: number;
  lastResult?: QuestionHistoryEntry["result"];
  averageTimeMs?: number;
};

export function findWeakQuestions(
  entries: QuestionHistoryEntry[],
): WeakQuestion[] {
  const byQuestion = new Map<string, QuestionHistoryEntry[]>();
  for (const entry of entries) {
    const list = byQuestion.get(entry.questionId) ?? [];
    list.push(entry);
    byQuestion.set(entry.questionId, list);
  }

  const weak: WeakQuestion[] = [];

  for (const [questionId, attempts] of byQuestion) {
    const ordered = [...attempts].sort((left, right) =>
      right.completedAt.localeCompare(left.completedAt),
    );
    const incorrectCount = attempts.filter((item) => item.result === "incorrect").length;
    const hardCount = attempts.filter((item) => item.difficulty === "hard").length;
    const last = ordered[0];
    const times = attempts
      .map((item) => item.timeSpentMs)
      .filter((value): value is number => typeof value === "number");
    const averageTimeMs =
      times.length > 0
        ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length)
        : undefined;
    const slowIncorrect = attempts.some(
      (item) => item.result === "incorrect" && (item.timeSpentMs ?? 0) >= 120_000,
    );

    const reasons: string[] = [];
    let score = 0;

    if (incorrectCount > 0) {
      score += incorrectCount * 2;
      reasons.push(
        `Incorrect ${incorrectCount} ${incorrectCount === 1 ? "time" : "times"}`,
      );
    }
    if (last?.result === "incorrect") {
      score += 2;
      reasons.push("Most recent attempt was incorrect");
    }
    if (hardCount > 0) {
      score += hardCount;
      reasons.push(`Rated Hard ${hardCount} ${hardCount === 1 ? "time" : "times"}`);
    }
    if (slowIncorrect && averageTimeMs) {
      score += 1;
      reasons.push("Slow on incorrect attempts");
    }

    const hasEverBeenCorrect = attempts.some((item) => item.result === "correct");
    if (incorrectCount >= 2 && !hasEverBeenCorrect) {
      score += 2;
      reasons.push("Not yet answered correctly");
    }

    if (score >= 3 || incorrectCount >= 2 || hardCount >= 2 || last?.result === "incorrect") {
      const item: WeakQuestion = {
        questionId,
        score,
        reasons,
        incorrectCount,
        hardCount,
        lastResult: last?.result,
      };
      if (averageTimeMs !== undefined) {
        item.averageTimeMs = averageTimeMs;
      }
      weak.push(item);
    }
  }

  return weak.sort((left, right) => right.score - left.score);
}
