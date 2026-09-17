import {
  formatBankSubject,
  normalizeSubjectKey,
} from "@/features/question-sets/subject";
import {
  computeSetOverview,
  type AccuracyStats,
} from "@/features/statistics/computeStatistics";
import {
  summarizeQuestionDifficulty,
  type DifficultySummary,
} from "@/features/statistics/difficultySummary";
import type { QuestionSet } from "@/types/question";
import type { StudySession } from "@/types/session";

export type SubjectStatistics = {
  key: string;
  name: string;
  bankCount: number;
  questionCount: number;
  questionsAttempted: number;
  sessions: number;
  accuracy: AccuracyStats;
  averageTimeMs: number | null;
  lastStudiedAt?: string;
  difficulty: DifficultySummary;
  sets: QuestionSet[];
};

export function computeSubjectStatistics(
  sets: QuestionSet[],
  sessions: StudySession[],
): SubjectStatistics[] {
  const groups = new Map<string, QuestionSet[]>();
  const names = new Map<string, string>();

  for (const set of sets) {
    const key = normalizeSubjectKey(set.subject);
    const list = groups.get(key) ?? [];
    list.push(set);
    groups.set(key, list);
    if (!names.has(key)) {
      names.set(key, formatBankSubject(set.subject));
    }
  }

  return [...groups.entries()]
    .map(([key, groupSets]) => {
      const questions = groupSets.flatMap((set) => set.questions);
      const setIds = new Set(groupSets.map((set) => set.id));
      const groupSessions = sessions.filter(
        (session) =>
          session.subjectKey === key || setIds.has(session.questionSetId),
      );
      const overview = computeSetOverview(questions.length, groupSessions);
      const stats: SubjectStatistics = {
        key,
        name: names.get(key) ?? formatBankSubject(),
        bankCount: groupSets.length,
        questionCount: questions.length,
        questionsAttempted: overview.questionsAttempted,
        sessions: overview.sessions,
        accuracy: overview.accuracy,
        averageTimeMs: overview.averageTimeMs,
        difficulty: summarizeQuestionDifficulty(questions),
        sets: groupSets,
      };
      if (overview.lastStudiedAt) {
        stats.lastStudiedAt = overview.lastStudiedAt;
      }
      return stats;
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}
