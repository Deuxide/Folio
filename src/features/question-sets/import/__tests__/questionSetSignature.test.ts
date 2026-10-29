import { describe, expect, it } from "vitest";
import {
  questionSetSignature,
  questionSetsHaveSameContent,
} from "../questionSetSignature";
import type { QuestionSet } from "@/types/question";

function baseSet(questions: QuestionSet["questions"]): QuestionSet {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    id: "set-1",
    title: "Physics",
    questions,
    createdAt: now,
    updatedAt: now,
  };
}

function question(id: string, overrides = {}) {
  return {
    id,
    question: `Question ${id}`,
    type: "true_false",
    answer: true,
    ...overrides,
  };
}

describe("questionSetSignature", () => {
  it("is equal for sets with identical content in different question order", () => {
    const left = baseSet([question("q1"), question("q2")]);
    const right = baseSet([question("q2"), question("q1")]);
    expect(questionSetsHaveSameContent(left, right)).toBe(true);
    expect(questionSetSignature(left)).toBe(questionSetSignature(right));
  });

  it("detects answer, grading-option, and text changes", () => {
    const left = baseSet([question("q1")]);
    expect(
      questionSetsHaveSameContent(
        left,
        baseSet([question("q1", { answer: false })]),
      ),
    ).toBe(false);
    expect(
      questionSetsHaveSameContent(
        left,
        baseSet([question("q1", { partialCredit: true })]),
      ),
    ).toBe(false);
    expect(
      questionSetsHaveSameContent(
        left,
        baseSet([question("q1", { question: "Changed" })]),
      ),
    ).toBe(false);
    expect(
      questionSetsHaveSameContent(
        baseSet([question("q1")]),
        baseSet([question("q1", { explanation: "Because…" })]),
      ),
    ).toBe(false);
  });

  it("ignores timestamps and user difficulty ratings", () => {
    const original = baseSet([question("q1")]);
    const touched: QuestionSet = {
      ...original,
      updatedAt: "2026-03-01T00:00:00.000Z",
      questions: [{ ...question("q1"), difficulty: "hard" }],
    };
    expect(questionSetsHaveSameContent(original, touched)).toBe(true);
  });

  it("respects title, subject, and description", () => {
    const original = baseSet([question("q1")]);
    expect(
      questionSetsHaveSameContent(original, { ...original, title: "Renamed" }),
    ).toBe(false);
    expect(
      questionSetsHaveSameContent(original, {
        ...original,
        subject: "Physics",
      }),
    ).toBe(false);
    expect(
      questionSetsHaveSameContent(original, {
        ...original,
        description: "New",
      }),
    ).toBe(false);
  });
});
