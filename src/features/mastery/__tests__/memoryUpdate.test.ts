import { describe, expect, it } from "vitest";
import { buildMemoryMapFromSessions } from "../memoryUpdate";
import type { StudySession } from "@/types/session";

/**
 * A minimal completed session with frozen grading results, so no question
 * grading is needed to replay outcomes.
 */
function completedSession(overrides: {
  id: string;
  completedAt: string;
  questionIds: string[];
  gradingResults: Record<string, string>;
  attempts?: Record<string, { questionId: string; confidence?: string }>;
  questionSetId?: string;
  questionSetTitle?: string;
  kind?: "set" | "subject";
  subjectKey?: string;
  questionSourceSetIds?: Record<string, string>;
}): StudySession {
  return {
    id: `${overrides.id}`,
    questionSetId: overrides.questionSetId ?? "set-physics",
    questionSetTitle: overrides.questionSetTitle ?? "Physics bank",
    questionIds: overrides.questionIds,
    currentIndex: 0,
    attempts: (overrides.attempts ?? {}) as StudySession["attempts"],
    configuration: {
      selectionMode: "all",
      questionCount: overrides.questionIds.length,
      randomizeQuestions: false,
      timeLimitMode: "none",
    },
    status: "completed",
    startedAt: overrides.completedAt,
    completedAt: overrides.completedAt,
    gradingResults: overrides.gradingResults as never,
    ...(overrides.kind === "subject"
      ? {
          kind: "subject" as const,
          subjectKey: overrides.subjectKey ?? "physics",
        }
      : {}),
    ...(overrides.questionSourceSetIds
      ? { questionSourceSetIds: overrides.questionSourceSetIds }
      : {}),
  };
}

describe("buildMemoryMapFromSessions", () => {
  it("starts new cards from empty memory and accumulates across sessions", () => {
    const later = buildMemoryMapFromSessions([
      completedSession({
        id: "s2",
        completedAt: "2026-01-05T00:00:00.000Z",
        questionIds: ["q1"],
        gradingResults: { q1: "incorrect" },
      }),
      completedSession({
        id: "s1",
        completedAt: "2026-01-02T00:00:00.000Z",
        questionIds: ["q1"],
        gradingResults: { q1: "correct" },
      }),
    ]);
    // Session order in input must not matter: the replay is chronological.
    const memory = later.get("q1");
    expect(memory).toBeDefined();
    expect(memory?.lastStudiedAt).toBe("2026-01-05T00:00:00.000Z");
    expect(memory?.lapses).toBe(1);
    // correct (new→learning, +0.05 ease) then lapse (−0.2)
    expect(memory?.ease).toBeCloseTo(2.35, 5);
    expect(memory?.cardState).toBe("learning");
    expect(memory?.intervalDays).toBe(1);
    expect(memory?.dueAt).toBe("2026-01-06T00:00:00.000Z");
  });

  it("ignores ungraded and unanswered attempts", () => {
    const memoryMap = buildMemoryMapFromSessions([
      completedSession({
        id: "s1",
        completedAt: "2026-01-02T00:00:00.000Z",
        questionIds: ["q1", "q2"],
        gradingResults: { q1: "ungraded", q2: "unanswered" },
      }),
    ]);
    expect(memoryMap.size).toBe(0);
  });

  it("records confident wrong answers from attempt confidence", () => {
    const memoryMap = buildMemoryMapFromSessions([
      completedSession({
        id: "s1",
        completedAt: "2026-01-02T00:00:00.000Z",
        questionIds: ["q1"],
        gradingResults: { q1: "incorrect" },
        attempts: { q1: { questionId: "q1", confidence: "sure" } },
      }),
    ]);
    expect(memoryMap.get("q1")?.lastOutcome).toBe("confident_wrong");
  });

  it("attributes set sessions to their bank", () => {
    const memoryMap = buildMemoryMapFromSessions([
      completedSession({
        id: "s1",
        completedAt: "2026-01-02T00:00:00.000Z",
        questionIds: ["q1"],
        gradingResults: { q1: "correct" },
        questionSetId: "set-physics",
      }),
    ]);
    expect(memoryMap.get("q1")?.setIds).toEqual(["set-physics"]);
  });

  it("attributes subject sessions via questionSourceSetIds, not the virtual bank", () => {
    const memoryMap = buildMemoryMapFromSessions([
      completedSession({
        id: "s1",
        completedAt: "2026-01-02T00:00:00.000Z",
        questionIds: ["q1", "q2"],
        gradingResults: { q1: "correct", q2: "correct" },
        kind: "subject",
        subjectKey: "physics",
        questionSetId: "subject:physics",
        questionSourceSetIds: { q1: "set-algebra" },
      }),
    ]);
    expect(memoryMap.get("q1")?.setIds).toEqual(["set-algebra"]);
    // q2 has no known source bank: no polluting subject pseudo-id.
    expect(memoryMap.get("q2")?.setIds).toEqual([]);
  });

  it("merges bank attribution when a question spans multiple banks", () => {
    const memoryMap = buildMemoryMapFromSessions([
      completedSession({
        id: "s1",
        completedAt: "2026-01-02T00:00:00.000Z",
        questionIds: ["q1"],
        gradingResults: { q1: "correct" },
        questionSetId: "set-physics",
      }),
      completedSession({
        id: "s2",
        completedAt: "2026-01-03T00:00:00.000Z",
        questionIds: ["q1"],
        gradingResults: { q1: "correct" },
        questionSetId: "set-review",
      }),
    ]);
    expect(memoryMap.get("q1")?.setIds.sort()).toEqual([
      "set-physics",
      "set-review",
    ]);
  });
});
