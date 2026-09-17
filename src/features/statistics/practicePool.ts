import type { QuestionHistoryEntry } from "@/features/history/extractAttempts";
import { findWeakQuestions } from "@/features/statistics/weakQuestions";
import type { PracticeFocus } from "@/types/session";
import type { Question } from "@/types/question";

export function getPracticePool(
  questions: Question[],
  focus: PracticeFocus | undefined,
  history: QuestionHistoryEntry[],
): Question[] {
  if (!focus || focus === "all") {
    return questions;
  }

  const byQuestion = new Map<string, QuestionHistoryEntry[]>();
  for (const entry of history) {
    const list = byQuestion.get(entry.questionId) ?? [];
    list.push(entry);
    byQuestion.set(entry.questionId, list);
  }

  const weakIds = new Set(
    findWeakQuestions(history).map((item) => item.questionId),
  );

  return questions.filter((question) => {
    const attempts = byQuestion.get(question.id) ?? [];
    if (focus === "unanswered") {
      return !attempts.some((attempt) => attempt.result === "correct");
    }
    if (focus === "incorrect") {
      return attempts.some((attempt) => attempt.result === "incorrect");
    }
    if (focus === "hard") {
      return (
        question.difficulty === "hard" ||
        attempts.some((attempt) => attempt.difficulty === "hard")
      );
    }
    if (focus === "weak") {
      return weakIds.has(question.id);
    }
    return true;
  });
}
