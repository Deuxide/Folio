import { persistNormalizedOptions } from "@/features/questions/media";
import { normalizeQuestionType } from "@/features/questions/normalizeQuestionType";
import { selectQuestionIds } from "@/features/study/selectQuestions";
import { minutesToMs } from "@/features/study/timer";
import { createId } from "@/lib/ids";
import type { QuestionSet } from "@/types/question";
import type {
  SessionConfiguration,
  StudySession,
} from "@/types/session";

export function createDefaultSessionConfiguration(
  availableCount: number,
): SessionConfiguration {
  return {
    selectionMode: "all",
    questionCount: Math.max(availableCount, 1),
    randomizeQuestions: false,
    timeLimitMode: "none",
    sessionTimeLimitMinutes: 60,
    perQuestionMinutes: 2,
    practiceFocus: "all",
    distribution: "combined",
  };
}

export function validateSessionConfiguration(
  configuration: SessionConfiguration,
  availableCount: number,
): string[] {
  const problems: string[] = [];

  if (availableCount === 0) {
    problems.push("This question set does not contain any questions.");
    return problems;
  }

  if (configuration.selectionMode === "count") {
    if (
      !Number.isInteger(configuration.questionCount) ||
      configuration.questionCount < 1
    ) {
      problems.push("Choose at least 1 question.");
    } else if (configuration.questionCount > availableCount) {
      problems.push(
        `This set has ${availableCount} questions. Choose ${availableCount} or fewer.`,
      );
    }
  }

  const usesSessionTimer =
    configuration.timeLimitMode === "session" ||
    configuration.timeLimitMode === "both";
  const usesQuestionTimer =
    configuration.timeLimitMode === "question" ||
    configuration.timeLimitMode === "both";

  if (usesSessionTimer) {
    const minutes = configuration.sessionTimeLimitMinutes;
    if (minutes === undefined || !Number.isFinite(minutes) || minutes <= 0) {
      problems.push("Enter a session time limit greater than zero.");
    }
  }

  if (usesQuestionTimer) {
    const minutes = configuration.perQuestionMinutes;
    if (minutes === undefined || !Number.isFinite(minutes) || minutes <= 0) {
      problems.push("Enter a per-question time limit greater than zero.");
    }
  }

  return problems;
}

export function createStudySession(
  questionSet: QuestionSet,
  configuration: SessionConfiguration,
  pool = questionSet.questions,
  options?: {
    kind?: StudySession["kind"];
    subjectKey?: string;
    subjectName?: string;
    sourceSets?: QuestionSet[];
    questionSourceSetIds?: Record<string, string>;
    scheduledEventId?: string;
  },
): StudySession {
  const startedAtMs = Date.now();
  const questionIds = selectQuestionIds(
    pool,
    configuration,
    options?.questionSourceSetIds,
  );
  const snapshots = Object.fromEntries(
    pool
      .filter((question) => questionIds.includes(question.id))
      .map((question) => {
        const kind = normalizeQuestionType(question.type);
        const snapshot =
          kind === "single_choice" || kind === "multiple_choice"
            ? persistNormalizedOptions(question)
            : question;
        return [question.id, snapshot];
      }),
  );
  const usesSessionTimer =
    configuration.timeLimitMode === "session" ||
    configuration.timeLimitMode === "both";
  const usesQuestionTimer =
    configuration.timeLimitMode === "question" ||
    configuration.timeLimitMode === "both";

  const attempts = Object.fromEntries(
    questionIds.flatMap((questionId) => {
      const question = snapshots[questionId];
      if (!question?.difficulty) {
        return [];
      }
      return [
        [
          questionId,
          {
            questionId,
            difficulty: question.difficulty,
          },
        ],
      ];
    }),
  );

  const session: StudySession = {
    id: createId("session"),
    questionSetId: questionSet.id,
    questionSetTitle: questionSet.title,
    questionIds,
    currentIndex: 0,
    attempts,
    configuration,
    questionSnapshots: snapshots,
    status: "in_progress",
    startedAt: new Date(startedAtMs).toISOString(),
  };

  if (options?.kind) {
    session.kind = options.kind;
  }
  if (options?.subjectKey) {
    session.subjectKey = options.subjectKey;
  }
  if (options?.subjectName) {
    session.subjectName = options.subjectName;
  }
  if (options?.sourceSets && options.sourceSets.length > 0) {
    session.sourceSetIds = options.sourceSets.map((set) => set.id);
    session.sourceSetTitles = Object.fromEntries(
      options.sourceSets.map((set) => [set.id, set.title]),
    );
  }
  if (options?.scheduledEventId) {
    session.scheduledEventId = options.scheduledEventId;
  }
  if (options?.questionSourceSetIds) {
    session.questionSourceSetIds = Object.fromEntries(
      questionIds.flatMap((questionId) => {
        const sourceId = options.questionSourceSetIds?.[questionId];
        return sourceId ? [[questionId, sourceId]] : [];
      }),
    );
  }

  if (usesSessionTimer && configuration.sessionTimeLimitMinutes) {
    session.sessionDeadline = new Date(
      startedAtMs + minutesToMs(configuration.sessionTimeLimitMinutes),
    ).toISOString();
  }

  if (usesQuestionTimer && configuration.perQuestionMinutes) {
    session.questionTimeLimitMs = minutesToMs(configuration.perQuestionMinutes);
  }

  return session;
}
