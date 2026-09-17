import { getPracticePool } from "@/features/statistics/practicePool";
import type { QuestionHistoryEntry } from "@/features/history/extractAttempts";
import type { Question, QuestionSet } from "@/types/question";
import type { PracticeFocus } from "@/types/session";

export type SubjectPool = {
  questions: Question[];
  sourceByQuestionId: Record<string, string>;
};

export function buildSubjectPool(
  sets: QuestionSet[],
  focus: PracticeFocus | undefined,
  history: QuestionHistoryEntry[],
): SubjectPool {
  const seen = new Set<string>();
  const questions: Question[] = [];
  const sourceByQuestionId: Record<string, string> = {};

  for (const set of sets) {
    const filtered = getPracticePool(set.questions, focus, history);
    for (const question of filtered) {
      if (seen.has(question.id)) {
        continue;
      }
      seen.add(question.id);
      questions.push(question);
      sourceByQuestionId[question.id] = set.id;
    }
  }

  return { questions, sourceByQuestionId };
}

export function virtualSubjectSet(
  subjectKey: string,
  subjectName: string,
  questions: Question[],
): QuestionSet {
  const now = new Date().toISOString();
  return {
    id: `subject:${subjectKey}`,
    title: `${subjectName} Test`,
    subject: subjectName,
    questions,
    createdAt: now,
    updatedAt: now,
  };
}
