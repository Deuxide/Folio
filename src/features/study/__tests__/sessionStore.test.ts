import { beforeEach, describe, expect, it } from "vitest";
import {
  checkCurrentAnswer,
  getSessionState,
  loadSession,
  setQuestionConfidence,
  setSelfGrading,
  setUserAnswer,
} from "../sessionStore";
import { resolveAttemptOutcome } from "@/features/grading/attemptOutcome";
import type { GradingStatus } from "@/types/grading";
import type { Question } from "@/types/question";
import type { QuestionAttempt, StudySession } from "@/types/session";

function question(id: string, overrides: Partial<Question> = {}): Question {
  return {
    id,
    question: `Question ${id}`,
    type: "short_answer",
    ...overrides,
  };
}

function learnSession(): StudySession {
  return {
    id: "session-1",
    questionSetId: "set-1",
    questionSetTitle: "Learn set",
    mode: "learn",
    questionIds: ["q1", "q2"],
    currentIndex: 0,
    attempts: {},
    configuration: {
      mode: "learn",
      selectionMode: "all",
      questionCount: 2,
      randomizeQuestions: false,
      timeLimitMode: "none",
    },
    questionSnapshots: {
      q1: question("q1", { answer: "5x" }),
      q2: question("q2", { answer: "open" }),
    },
    status: "in_progress",
    startedAt: "2026-01-01T00:00:00.000Z",
  };
}

function attemptOf(
  session: StudySession,
  questionId: string,
): QuestionAttempt {
  return session.attempts[questionId] ?? { questionId };
}

function outcomeStatus(
  session: StudySession,
  questionId: string,
): GradingStatus {
  return resolveAttemptOutcome(
    session,
    questionId,
    session.questionSnapshots?.[questionId],
  ).status;
}

function storedSession(): StudySession {
  const state = getSessionState();
  if (!state.session) {
    throw new Error("No session loaded");
  }
  return state.session;
}

beforeEach(() => {
  loadSession(learnSession());
});

describe("Learn-mode answer checking", () => {
  it("grades the current answer at check time and stores the outcome", () => {
    setUserAnswer("q1", "5x");
    checkCurrentAnswer(question("q1", { answer: "5x" }));

    const attempt = attemptOf(storedSession(), "q1");
    expect(attempt.result).toBe("correct");
    expect(attempt.checkedAt).toBeDefined();
  });

  it("ignores repeat check requests instead of re-grading", () => {
    setUserAnswer("q1", "6x");
    checkCurrentAnswer(question("q1", { answer: "5x" }));
    // The answer key changing (a set edit) is not a new outcome: a second
    // check request is discarded, keeping the recorded result frozen.
    checkCurrentAnswer(question("q1", { answer: "6x" }));
    expect(attemptOf(storedSession(), "q1").result).toBe("incorrect");
  });

  it("clears a stored outcome when the user replaces the answer", () => {
    setUserAnswer("q1", "5x");
    checkCurrentAnswer(question("q1", { answer: "5x" }));
    setUserAnswer("q1", "6x");

    const attempt = attemptOf(storedSession(), "q1");
    expect(attempt.result).toBeUndefined();
    expect(attempt.checkedAt).toBeUndefined();
    expect(attempt.userAnswer).toBe("6x");
  });

  it("requires an answer before checking", () => {
    checkCurrentAnswer(question("q1", { answer: "5x" }));
    expect(attemptOf(storedSession(), "q1").result).toBeUndefined();
  });

  it("locks confidence once an outcome is recorded", () => {
    setQuestionConfidence("q1", "sure");
    setUserAnswer("q1", "5x");
    checkCurrentAnswer(question("q1", { answer: "5x" }));
    setQuestionConfidence("q1", "guessed");

    const attempt = attemptOf(storedSession(), "q1");
    expect(attempt.confidence).toBe("sure");
    expect(attempt.result).toBe("correct");
  });
});

describe("self-grading on completed sessions", () => {
  it("records the manual grade for ungraded questions", () => {
    const completed = learnSession();
    completed.status = "completed";
    completed.gradingResults = { q1: "correct", q2: "ungraded" };
    loadSession(completed);

    setSelfGrading("q2", "incorrect");

    const stored = storedSession();
    expect(attemptOf(stored, "q2").selfGrading).toBe("incorrect");
    expect(outcomeStatus(stored, "q2")).toBe("incorrect");
    // Graded questions are untouched: no self-grade UI is offered there.
    expect(attemptOf(stored, "q1").selfGrading).toBeUndefined();
  });

  it("ignores self-grading requests for sessions still in progress", () => {
    setSelfGrading("q1", "correct");
    expect(attemptOf(storedSession(), "q1").selfGrading).toBeUndefined();
  });
});
