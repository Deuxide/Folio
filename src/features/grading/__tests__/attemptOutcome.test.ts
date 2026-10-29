import { describe, expect, it } from "vitest";
import {
  gradingModeForSession,
  resolveAttemptOutcome,
  withAttemptSelfGrading,
} from "../attemptOutcome";
import { buildGradingResults, withFinalResults } from "@/features/study/finalizeSession";
import type { StudySession } from "@/types/session";
import type { Question } from "@/types/question";

function question(id: string, overrides: Partial<Question> = {}): Question {
  return {
    id,
    question: `Question ${id}`,
    type: "short_answer",
    ...overrides,
  };
}

function session(overrides: Partial<StudySession>): StudySession {
  return {
    id: "session-1",
    questionSetId: "set-1",
    questionSetTitle: "Set",
    questionIds: [],
    currentIndex: 0,
    attempts: {},
    configuration: {
      selectionMode: "all",
      questionCount: 0,
      randomizeQuestions: false,
      timeLimitMode: "none",
    },
    status: "completed",
    startedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as StudySession;
}

describe("resolveAttemptOutcome precedence", () => {
  it("uses the frozen grading record first and never re-grades it", () => {
    const s = session({
      questionIds: ["q1"],
      gradingResults: { q1: "incorrect" },
    });
    // Even if new grading rules would now grade this differently, the
    // frozen record wins for completed sessions.
    expect(resolveAttemptOutcome(s, "q1").status).toBe("incorrect");
  });

  it("falls back to the answer-time Learn-mode result before recomputing", () => {
    // "café/銘" style case: enhanced rules would grade "cafe" correct, but
    // the attempt was recorded as incorrect at check time.
    const s = session({
      questionIds: ["q1"],
      mode: "learn",
      attempts: {
        q1: { questionId: "q1", userAnswer: "cafe", result: "incorrect" },
      },
    });
    const q = question("q1", { answer: "café" });
    expect(resolveAttemptOutcome(s, "q1", q).status).toBe("incorrect");
  });

  it("recomputes with legacy rules for sessions without a mode", () => {
    const s = session({
      questionIds: ["q1"],
      attempts: { q1: { questionId: "q1", userAnswer: "cafe" } },
    });
    const q = question("q1", { answer: "café" });
    expect(resolveAttemptOutcome(s, "q1", q).status).toBe("incorrect");
    expect(gradingModeForSession(s)).toBe("legacy");
  });

  it("recomputes with enhanced rules once a mode is recorded", () => {
    const s = session({
      questionIds: ["q1"],
      mode: "test",
      attempts: { q1: { questionId: "q1", userAnswer: "cafe" } },
    });
    const q = question("q1", { answer: "café" });
    expect(resolveAttemptOutcome(s, "q1", q).status).toBe("correct");
  });

  it("applies a user's self-grade only on top of an ungraded outcome", () => {
    const graded = session({
      questionIds: ["q1"],
      attempts: { q1: { questionId: "q1", userAnswer: "x", selfGrading: "correct" } },
      gradingResults: { q1: "ungraded" },
    });
    expect(resolveAttemptOutcome(graded, "q1").status).toBe("correct");

    const wrongGrade = session({
      questionIds: ["q1"],
      attempts: { q1: { questionId: "q1", userAnswer: "x", selfGrading: "incorrect" } },
      gradingResults: { q1: "ungraded" },
    });
    expect(resolveAttemptOutcome(wrongGrade, "q1").status).toBe("incorrect");

    const frozen = session({
      questionIds: ["q1"],
      attempts: { q1: { questionId: "q1", userAnswer: "x", selfGrading: "correct" } },
      gradingResults: { q1: "incorrect" },
    });
    // Self-grading never overrides a real grading result.
    expect(resolveAttemptOutcome(frozen, "q1").status).toBe("incorrect");
  });

  it("surfaces partial credit from gradingCredits or the attempt", () => {
    const fromCredits = session({
      questionIds: ["q1"],
      gradingResults: { q1: "incorrect" },
      gradingCredits: { q1: 0.5 },
    });
    expect(resolveAttemptOutcome(fromCredits, "q1").credit).toBe(0.5);

    const fromAttempt = session({
      questionIds: ["q1"],
      mode: "learn",
      attempts: {
        q1: {
          questionId: "q1",
          userAnswer: ["a"],
          result: "incorrect",
          partialCredit: 0.25,
        },
      },
    });
    expect(resolveAttemptOutcome(fromAttempt, "q1").credit).toBe(0.25);
  });

  it("keeps unresolved questions as unanswered or ungraded", () => {
    const s = session({
      questionIds: ["q1", "q2"],
      attempts: { q2: { questionId: "q2", userAnswer: "some text" } },
    });
    expect(resolveAttemptOutcome(s, "q1", undefined).status).toBe(
      "unanswered",
    );
    expect(resolveAttemptOutcome(s, "q2", undefined).status).toBe("ungraded");
  });
});

describe("withAttemptSelfGrading", () => {
  it("records the grade while preserving other attempt data", () => {
    const s = session({
      questionIds: ["q1", "q2"],
      attempts: {
        q1: { questionId: "q1", userAnswer: "text", difficulty: "hard" },
      },
    });
    const next = withAttemptSelfGrading(s, "q1", "correct");
    expect(next.attempts.q1?.selfGrading).toBe("correct");
    expect(next.attempts.q1?.difficulty).toBe("hard");
    expect(next.attempts.q2?.selfGrading).toBeUndefined();
  });
});

describe("buildGradingResults / withFinalResults", () => {
  it("prefers answer-time results and captures credits at completion", () => {
    const live = session({
      questionIds: ["q1", "q2"],
      mode: "learn",
      questionSnapshots: {
        q1: question("q1", { answer: "a" }),
        q2: question("q2", { answer: "b" }),
      },
      attempts: {
        q1: { questionId: "q1", userAnswer: "a", result: "correct" },
        q2: { questionId: "q2", userAnswer: "b" },
      },
    });
    const { results, credits } = buildGradingResults(live);
    expect(results).toEqual({ q1: "correct", q2: "correct" });
    expect(credits).toBeUndefined();
  });

  it("records partial credits keyed by question id", () => {
    const mcQuestion = question("q1", {
      type: "multiple_choice",
      options: [
        { id: "option-a", text: "A" },
        { id: "option-b", text: "B" },
        { id: "option-c", text: "C" },
      ],
      answer: ["option-a", "option-c"],
      partialCredit: true,
    });
    const live = session({
      questionIds: ["q1", "q2"],
      mode: "learn",
      questionSnapshots: {
        q1: mcQuestion,
        q2: question("q2", { answer: "b" }),
      },
      attempts: {
        q1: {
          questionId: "q1",
          userAnswer: ["option-a", "option-b"],
          result: "incorrect",
          partialCredit: 0.5,
        },
        q2: { questionId: "q2", userAnswer: "wrong" },
      },
    });
    const { results, credits } = buildGradingResults(live);
    expect(results).toEqual({ q1: "incorrect", q2: "incorrect" });
    expect(credits).toEqual({ q1: 0.5 });
  });

  it("never re-grades a session that already has frozen results", () => {
    const completed = session({
      questionIds: ["q1"],
      questionSnapshots: { q1: question("q1", { answer: "a" }) },
      attempts: { q1: { questionId: "q1", userAnswer: "changed answer" } },
      gradingResults: { q1: "correct" },
    });
    expect(withFinalResults(completed)).toBe(completed);
  });
});
