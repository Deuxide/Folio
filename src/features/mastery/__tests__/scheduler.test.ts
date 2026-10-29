import { describe, expect, it } from "vitest";
import {
  applyMemoryOutcome,
  createEmptyMemory,
  outcomeFromHistoryEntry,
} from "../scheduler";
import type { MemoryOutcome, QuestionMemory } from "@/types/mastery";

const NOW = "2026-01-01T00:00:00.000Z";
const DAY_MS = 86_400_000;

function recordWith(overrides: Partial<QuestionMemory>): QuestionMemory {
  return { ...createEmptyMemory("q1"), ...overrides };
}

function applyOutcome(
  memory: QuestionMemory,
  outcome: MemoryOutcome,
): QuestionMemory {
  return applyMemoryOutcome(memory, { outcome, studiedAt: NOW });
}

describe("createEmptyMemory", () => {
  it("starts unscheduled with default ease", () => {
    const memory = createEmptyMemory("q1", "set-1");
    expect(memory).toMatchObject({
      questionId: "q1",
      setIds: ["set-1"],
      ease: 2.5,
      intervalDays: 0,
      dueAt: "",
      cardState: "new",
      consecutiveCorrect: 0,
      lapses: 0,
    });
  });
});

describe("applyMemoryOutcome — correct answers", () => {
  it("schedules the first correct answer 1 day ahead (learning)", () => {
    const next = applyOutcome(recordWith({}), "correct");
    expect(next.cardState).toBe("learning");
    expect(next.intervalDays).toBe(1);
    expect(next.consecutiveCorrect).toBe(1);
    expect(next.dueAt).toBe(new Date(Date.parse(NOW) + DAY_MS).toISOString());
    expect(next.lastStudiedAt).toBe(NOW);
  });

  it("graduates to review on the second consecutive correct answer", () => {
    const learning = applyOutcome(recordWith({}), "correct");
    const next = applyOutcome(learning, "correct");
    // ease is now 2.55 → round(1 × 2.55) = 3 days
    expect(next.cardState).toBe("review");
    expect(next.intervalDays).toBe(3);
    expect(next.consecutiveCorrect).toBe(2);
  });

  it("multiplies the interval by ease on further review passes", () => {
    const review = recordWith({
      cardState: "review",
      intervalDays: 8,
      consecutiveCorrect: 3,
      ease: 2.5,
    });
    const next = applyOutcome(review, "correct");
    expect(next.intervalDays).toBe(Math.round(8 * 2.55));
    expect(next.cardState).toBe("review");
  });

  it("never schedules beyond the interval cap", () => {
    const nearCap = recordWith({
      cardState: "review",
      intervalDays: 179,
      ease: 3,
    });
    const next = applyOutcome(nearCap, "correct");
    expect(next.intervalDays).toBeLessThanOrEqual(180);
  });

  it("never raises ease above 3.0", () => {
    let memory = recordWith({ ease: 2.99 });
    memory = applyOutcome(memory, "correct");
    expect(memory.ease).toBe(3);
    memory = applyOutcome(memory, "correct");
    expect(memory.ease).toBe(3);
  });
});

describe("applyMemoryOutcome — lapses", () => {
  it("resets to a 1-day relearn interval and counts the lapse", () => {
    const next = applyOutcome(
      recordWith({ cardState: "review", intervalDays: 24, lapses: 1 }),
      "lapsed",
    );
    expect(next.cardState).toBe("learning");
    expect(next.intervalDays).toBe(1);
    expect(next.lapses).toBe(2);
    expect(next.consecutiveCorrect).toBe(0);
    expect(next.ease).toBeCloseTo(2.3, 5);
  });

  it("keeps ease within the floor after repeated losses", () => {
    let memory = recordWith({ ease: 1.35 });
    memory = applyOutcome(memory, "lapsed");
    expect(memory.ease).toBeCloseTo(1.3, 5);
    memory = applyOutcome(memory, "lapsed");
    expect(memory.ease).toBeCloseTo(1.3, 5);
  });

  it("flags confidently-wrong answers without extra ease cost", () => {
    const next = applyOutcome(recordWith({}), "confident_wrong");
    expect(next.lastOutcome).toBe("confident_wrong");
    expect(next.ease).toBeCloseTo(2.3, 5);
    expect(next.lapses).toBe(1);
  });
});

describe("outcomeFromHistoryEntry", () => {
  function historyEntry(overrides: {
    result: "correct" | "incorrect" | "ungraded" | "unanswered";
    confidence?: "sure" | "unsure" | "guessed";
  }) {
    return {
      questionId: "q1",
      sessionId: "session-1",
      questionSetId: "set-1",
      questionSetTitle: "Physics",
      userAnswer: null,
      result: overrides.result,
      confidence: overrides.confidence,
      completedAt: NOW,
    };
  }

  it("maps graded results and confidence", () => {
    expect(outcomeFromHistoryEntry(historyEntry({ result: "correct" }))).toEqual({
      outcome: "correct",
      studiedAt: NOW,
    });
    expect(
      outcomeFromHistoryEntry(historyEntry({ result: "incorrect" })),
    ).toEqual({ outcome: "lapsed", studiedAt: NOW });
    expect(
      outcomeFromHistoryEntry(
        historyEntry({ result: "incorrect", confidence: "sure" }),
      ),
    ).toEqual({ outcome: "confident_wrong", studiedAt: NOW });
  });
});
