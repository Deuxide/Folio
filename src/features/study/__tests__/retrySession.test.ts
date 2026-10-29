import { describe, expect, it } from "vitest";
import {
  buildRetryConfiguration,
  buildRetryPlan,
  getMissedQuestionIds,
} from "../retrySession";
import type { Question } from "@/types/question";
import type { StudySession } from "@/types/session";

function question(id: string): Question {
  return { id, question: `Question ${id}`, type: "true_false" };
}

function session(overrides: Partial<StudySession>): StudySession {
  return {
    id: "session-1",
    questionSetId: "set-1",
    questionSetTitle: "Physics bank",
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
  };
}

describe("getMissedQuestionIds", () => {
  it("lists incorrect and unanswered questions only", () => {
    const s = session({
      questionIds: ["q1", "q2", "q3", "q4"],
      questionSnapshots: {
        q1: question("q1"),
        q2: question("q2"),
        q3: question("q3"),
        q4: question("q4"),
      },
      gradingResults: {
        q1: "correct",
        q2: "incorrect",
        q3: "unanswered",
        q4: "ungraded",
      },
    });
    expect(getMissedQuestionIds(s)).toEqual(["q2", "q3"]);
  });
});

describe("buildRetryPlan", () => {
  it("collects snapshot questions for the missed ids", () => {
    const s = session({
      questionIds: ["q1", "q2"],
      questionSnapshots: {
        q1: question("q1"),
        q2: question("q2"),
        q3: question("q3"),
      },
      gradingResults: { q1: "correct", q2: "incorrect" },
    });
    const plan = buildRetryPlan(s);
    expect(plan.pool.map((item) => item.id)).toEqual(["q2"]);
  });

  it("carries question source mapping for subject sessions", () => {
    const s = session({
      questionIds: ["q1", "q2"],
      questionSnapshots: { q1: question("q1"), q2: question("q2") },
      gradingResults: { q1: "incorrect", q2: "correct" },
      questionSourceSetIds: { q1: "set-9", q2: "set-9" },
      sourceSetTitles: { "set-9": "Other bank", "set-ignored": "Unused" },
    });
    const plan = buildRetryPlan(s);
    expect(plan.questionSourceSetIds).toEqual({ q1: "set-9" });
    expect(plan.sourceSetTitles).toEqual({ "set-9": "Other bank" });
  });

  it("omits empty source mappings", () => {
    const s = session({
      questionIds: ["q1"],
      questionSnapshots: { q1: question("q1") },
      gradingResults: { q1: "correct" },
    });
    const plan = buildRetryPlan(s);
    expect(plan.questionSourceSetIds).toBeUndefined();
    expect(plan.sourceSetTitles).toBeUndefined();
  });
});

describe("buildRetryConfiguration", () => {
  it("runs in Learn mode over the missed pool", () => {
    const s = session({});
    const configuration = buildRetryConfiguration(s, 5);
    expect(configuration.mode).toBe("learn");
    expect(configuration.selectionMode).toBe("all");
    expect(configuration.questionCount).toBe(5);
    expect(configuration.practiceFocus).toBe("all");
    expect(configuration.randomizeQuestions).toBe(false);
  });

  it("keeps per-question timers but drops session-wide timers", () => {
    const both = session({
      configuration: {
        selectionMode: "all",
        questionCount: 0,
        randomizeQuestions: true,
        timeLimitMode: "both",
        sessionTimeLimitMinutes: 30,
        perQuestionMinutes: 2,
      },
    });
    const configuration = buildRetryConfiguration(both, 3);
    expect(configuration.timeLimitMode).toBe("question");
    expect(configuration.perQuestionMinutes).toBe(2);
    expect(configuration.sessionTimeLimitMinutes).toBeUndefined();
    expect(configuration.randomizeQuestions).toBe(true);

    const sessionOnly = session({
      configuration: {
        selectionMode: "all",
        questionCount: 0,
        randomizeQuestions: false,
        timeLimitMode: "session",
        sessionTimeLimitMinutes: 30,
      },
    });
    expect(buildRetryConfiguration(sessionOnly, 3).timeLimitMode).toBe("none");
  });
});
