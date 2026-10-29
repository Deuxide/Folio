import { describe, expect, it } from "vitest";
import { validateAndNormalizeQuestionSet } from "../validateAndNormalize";

describe("validateAndNormalizeQuestionSet tags", () => {
  it("normalizes an array of tags", () => {
    const imported = validateAndNormalizeQuestionSet({
      title: "Modern history",
      questions: [
        {
          id: "q-1",
          question: "What year did the wall fall?",
          type: "numeric",
          answer: 1989,
          tags: [" Cold War ", "germany", "germany"],
        },
      ],
    });

    expect(imported.questions[0]?.tags).toEqual(["Cold War", "germany"]);
  });

  it("accepts a comma-separated string of tags", () => {
    const imported = validateAndNormalizeQuestionSet({
      title: "Biology",
      questions: [
        {
          id: "q-1",
          question: "Powerhouse of the cell?",
          type: "short_answer",
          answer: "mitochondria",
          tags: "organelles, cell biology",
        },
      ],
    });

    expect(imported.questions[0]?.tags).toEqual([
      "organelles",
      "cell biology",
    ]);
  });

  it("ignores empty tag lists", () => {
    const imported = validateAndNormalizeQuestionSet({
      title: "Empty tags",
      questions: [
        {
          id: "q-1",
          question: "Any question?",
          type: "true_false",
          answer: true,
          tags: "  ",
        },
      ],
    });

    expect(imported.questions[0]?.tags).toBeUndefined();
  });

  it("keeps legacy sets without tags valid", () => {
    const imported = validateAndNormalizeQuestionSet({
      title: "Legacy",
      questions: [
        {
          id: "q-1",
          question: "2 + 2?",
          type: "numeric",
          answer: 4,
        },
      ],
    });

    expect(imported.questions[0]?.tags).toBeUndefined();
    expect(imported.questions[0]?.type).toBe("numeric");
  });
});
