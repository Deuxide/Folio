import { describe, expect, it } from "vitest";
import {
  gradeMultipleChoice,
  gradeNumeric,
  gradeQuestion,
  gradeShortAnswer,
  gradeSingleChoice,
  gradeTrueFalse,
} from "../gradeQuestion";
import type { Question } from "@/types/question";

function question(overrides: Partial<Question> & Pick<Question, "id" | "type">): Question {
  return {
    question: "Q",
    ...overrides,
  };
}

describe("gradeQuestion dispatch and statuses", () => {
  it("marks answer keys as ungraded and empty answers as unanswered", () => {
    const noKey = question({ id: "q1", type: "short_answer" });
    expect(gradeQuestion(noKey, undefined)).toEqual({ status: "unanswered" });
    expect(gradeQuestion(noKey, "something")).toEqual({ status: "ungraded" });

    const answered = question({
      id: "q2",
      type: "short_answer",
      answer: "5x",
    });
    expect(gradeQuestion(answered, undefined)).toEqual({ status: "unanswered" });
  });

  it("marks unsupported types as ungraded", () => {
    const q = question({ id: "q3", type: "essay", answer: "whatever" });
    expect(gradeQuestion(q, "my essay")).toEqual({ status: "ungraded" });
  });
});

describe("gradeSingleChoice", () => {
  it("grades by option id", () => {
    const q = question({
      id: "q1",
      type: "single_choice",
      options: [{ id: "option-a", text: "3" }, { id: "option-b", text: "4" }],
      answer: "option-b",
    });
    expect(gradeSingleChoice(q, "option-b").status).toBe("correct");
    expect(gradeSingleChoice(q, "option-a").status).toBe("incorrect");
    expect(gradeSingleChoice(q, "not-an-option").status).toBe("incorrect");
  });

  it("keeps the pre-upgrade fallback for unresolved option keys", () => {
    const q = question({
      id: "q2",
      type: "single_choice",
      options: [{ id: "option-a", text: "3" }],
      answer: "option-missing",
    });
    // String keys that do not resolve to an option fall back to a raw string
    // comparison — pre-existing behavior that must not change.
    expect(gradeSingleChoice(q, "option-missing").status).toBe("correct");
    expect(gradeSingleChoice(q, "option-a").status).toBe("incorrect");

    // Non-string keys that do not resolve stay ungraded.
    const objectKey = question({
      id: "q3",
      type: "single_choice",
      options: [{ id: "option-a", text: "3" }],
      answer: { value: "unknown" },
    });
    expect(gradeSingleChoice(objectKey, "option-a").status).toBe("ungraded");
  });
});

describe("gradeTrueFalse", () => {
  it("accepts boolean and string keys", () => {
    const q = question({ id: "q1", type: "true_false", answer: true });
    expect(gradeTrueFalse(q, true).status).toBe("correct");
    expect(gradeTrueFalse(q, "yes").status).toBe("correct");
    expect(gradeTrueFalse(q, false).status).toBe("incorrect");
  });
});

describe("gradeShortAnswer (enhanced)", () => {
  const q = question({ id: "q1", type: "short_answer", answer: "Café au lait" });

  it("matches across case, diacritics, and whitespace", () => {
    expect(gradeShortAnswer(q, "cafe au lait").status).toBe("correct");
    expect(gradeShortAnswer(q, "  CAFÉ   AU LAIT ").status).toBe("correct");
  });

  it("does not match unrelated answers", () => {
    expect(gradeShortAnswer(q, "espresso").status).toBe("incorrect");
  });

  it("accepts each accepted answer", () => {
    const withAccepted = {
      ...q,
      acceptedAnswers: ["Caffe latte", "Milky Coffee"],
    };
    expect(gradeShortAnswer(withAccepted, "caffe latte").status).toBe(
      "correct",
    );
    expect(gradeShortAnswer(withAccepted, "MILKY  coffee.").status).toBe(
      "correct",
    );
    expect(gradeShortAnswer(withAccepted, "espresso").status).toBe("incorrect");
  });
});

describe("gradeShortAnswer (legacy)", () => {
  it("keeps the exact pre-upgrade comparison", () => {
    const q = question({ id: "q1", type: "short_answer", answer: "Café" });
    // Legacy never folded diacritics: this pair graded incorrect before and
    // must still grade incorrect for legacy sessions.
    expect(
      gradeShortAnswer(q, "cafe", "legacy" as const).status,
    ).toBe("incorrect");
    expect(gradeShortAnswer(q, "café", "legacy" as const).status).toBe(
      "correct",
    );
    // Enhanced folds diacritics for new sessions.
    expect(gradeShortAnswer(q, "café").status).toBe("correct");
  });

  it("ignores acceptedAnswers in legacy mode", () => {
    const q = question({
      id: "q2",
      type: "short_answer",
      answer: "a",
      acceptedAnswers: ["b"],
    });
    expect(gradeShortAnswer(q, "b", "legacy" as const).status).toBe(
      "incorrect",
    );
  });
});

describe("gradeNumeric (enhanced)", () => {
  it("grades exact numbers as before", () => {
    const q = question({ id: "q1", type: "numeric", answer: 84 });
    expect(gradeNumeric(q, 84).status).toBe("correct");
    expect(gradeNumeric(q, "84").status).toBe("correct");
    expect(gradeNumeric(q, 83.9).status).toBe("incorrect");
  });

  it("applies an absolute tolerance", () => {
    const q = question({
      id: "q2",
      type: "numeric",
      answer: 84,
      tolerance: 0.5,
    });
    expect(gradeNumeric(q, 83.6).status).toBe("correct");
    expect(gradeNumeric(q, "84.4").status).toBe("correct");
    expect(gradeNumeric(q, 83.4).status).toBe("incorrect");
  });

  it("applies a relative tolerance", () => {
    const q = question({
      id: "q3",
      type: "numeric",
      answer: 5000,
      relativeTolerance: 0.01,
    });
    expect(gradeNumeric(q, 5049).status).toBe("correct");
    // Tolerance is inclusive at the boundary (±50 on 5000).
    expect(gradeNumeric(q, "5050").status).toBe("correct");
    expect(gradeNumeric(q, 5051).status).toBe("incorrect");
  });

  it("accepts the expected unit typed after the value", () => {
    const q = question({
      id: "q4",
      type: "numeric",
      answer: 25,
      unit: "m/s^2",
    });
    expect(gradeNumeric(q, "25 m/s^2").status).toBe("correct");
    expect(gradeNumeric(q, "25m/s^2").status).toBe("correct");
    expect(gradeNumeric(q, 25).status).toBe("correct");
    expect(gradeNumeric(q, "24 m/s^2").status).toBe("incorrect");
  });

  it("stays ungraded when the key is not a number", () => {
    const q = question({ id: "q5", type: "numeric", answer: "many" });
    expect(gradeNumeric(q, 3).status).toBe("ungraded");
  });
});

describe("gradeNumeric (legacy)", () => {
  it("uses exact float equality and the legacy parser", () => {
    const q = question({ id: "q1", type: "numeric", answer: 84, tolerance: 10 });
    expect(
      gradeNumeric(q, 83.9, "legacy" as const).status,
    ).toBe("incorrect");
    expect(gradeNumeric(q, 84, "legacy" as const).status).toBe("correct");
  });

  it("treats keys that the legacy parser could not read as ungraded", () => {
    const q = question({ id: "q2", type: "numeric", answer: "84,5" });
    expect(gradeNumeric(q, 84.5, "legacy" as const).status).toBe("ungraded");
    expect(gradeNumeric(q, 84.5).status).toBe("correct");
  });
});

describe("gradeMultipleChoice", () => {
  const q = question({
    id: "q1",
    type: "multiple_choice",
    options: [
      { id: "option-a", text: "2" },
      { id: "option-b", text: "3" },
      { id: "option-c", text: "4" },
    ],
    answer: ["option-a", "option-c"],
  });

  it("is all-or-nothing by default", () => {
    expect(gradeMultipleChoice(q, ["option-a", "option-c"]).status).toBe(
      "correct",
    );
    const result = gradeMultipleChoice(q, ["option-a", "option-b"]);
    expect(result.status).toBe("incorrect");
    expect(result.credit).toBeUndefined();
  });

  it("awards opt-in partial credit", () => {
    const withPartial = { ...q, partialCredit: true };

    // One correct selection, one wrong one → net zero credit.
    const netZero = gradeMultipleChoice(withPartial, ["option-a", "option-b"]);
    expect(netZero.status).toBe("incorrect");
    expect(netZero.credit).toBe(0);

    // Both correct selections with one extra → 0.5.
    const partial = gradeMultipleChoice(withPartial, [
      "option-a",
      "option-b",
      "option-c",
    ]);
    expect(partial.status).toBe("incorrect");
    expect(partial.credit).toBe(0.5);

    expect(
      gradeMultipleChoice(withPartial, ["option-a", "option-c"]).status,
    ).toBe("correct");
  });

  it("stays all-or-nothing in legacy mode even when the question asks for partial credit", () => {
    const withPartial = { ...q, partialCredit: true };
    const result = gradeMultipleChoice(withPartial, ["option-a"], "legacy" as const);
    expect(result.status).toBe("incorrect");
    expect(result.credit).toBeUndefined();
  });
});
