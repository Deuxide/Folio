import { hasUserAnswer } from "@/features/questions/isAnswered";
import {
  findOption,
  getNormalizedOptions,
  optionMatchesValue,
} from "@/features/questions/media";
import {
  isSupportedQuestionType,
  normalizeQuestionType,
} from "@/features/questions/normalizeQuestionType";
import type { GradingStatus } from "@/types/grading";
import type { Question } from "@/types/question";

export type { GradingStatus };

export type GradingResult = {
  status: GradingStatus;
};

function hasAnswerKey(question: Question): boolean {
  return question.answer !== undefined && question.answer !== null;
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string" && item.trim()) {
        return [item];
      }
      if (typeof item === "number" || typeof item === "boolean") {
        return [String(item)];
      }
      return [];
    });
  }
  if (typeof value === "string" && value.trim()) {
    return [value];
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  return [];
}

export function gradeSingleChoice(
  question: Question,
  userAnswer: unknown,
): GradingResult {
  const options = getNormalizedOptions(question);
  const correct = findOption(options, question.answer);
  const selected = findOption(options, userAnswer);

  if (!correct) {
    if (typeof question.answer === "string" || typeof question.answer === "number") {
      const expected = String(question.answer);
      const actual =
        typeof userAnswer === "string" || typeof userAnswer === "number"
          ? String(userAnswer)
          : "";
      return {
        status: actual === expected ? "correct" : "incorrect",
      };
    }
    return { status: "ungraded" };
  }

  if (!selected) {
    return { status: "incorrect" };
  }

  return {
    status: optionMatchesValue(correct, selected.id) ? "correct" : "incorrect",
  };
}

export function gradeMultipleChoice(
  question: Question,
  userAnswer: unknown,
): GradingResult {
  const options = getNormalizedOptions(question);
  const expectedValues = asStringList(question.answer);
  if (expectedValues.length === 0) {
    return { status: "ungraded" };
  }

  const expectedIds = new Set(
    expectedValues
      .map((value) => findOption(options, value)?.id ?? value)
      .sort(),
  );
  const selectedValues = asStringList(userAnswer);
  const selectedIds = new Set(
    selectedValues
      .map((value) => findOption(options, value)?.id ?? value)
      .sort(),
  );

  if (expectedIds.size !== selectedIds.size) {
    return { status: "incorrect" };
  }

  for (const id of expectedIds) {
    if (!selectedIds.has(id)) {
      return { status: "incorrect" };
    }
  }

  return { status: "correct" };
}

export function gradeTrueFalse(
  question: Question,
  userAnswer: unknown,
): GradingResult {
  const expected = normalizeBoolean(question.answer);
  const actual = normalizeBoolean(userAnswer);
  if (expected === undefined) {
    return { status: "ungraded" };
  }
  if (actual === undefined) {
    return { status: "incorrect" };
  }
  return { status: expected === actual ? "correct" : "incorrect" };
}

export function gradeShortAnswer(
  question: Question,
  userAnswer: unknown,
): GradingResult {
  if (typeof question.answer !== "string") {
    return { status: "ungraded" };
  }
  if (typeof userAnswer !== "string") {
    return { status: "incorrect" };
  }
  return {
    status:
      question.answer.trim().toLowerCase() === userAnswer.trim().toLowerCase()
        ? "correct"
        : "incorrect",
  };
}

export function gradeNumeric(
  question: Question,
  userAnswer: unknown,
): GradingResult {
  const expected = toFiniteNumber(question.answer);
  if (expected === undefined) {
    return { status: "ungraded" };
  }
  const actual = toFiniteNumber(userAnswer);
  if (actual === undefined) {
    return { status: "incorrect" };
  }
  return { status: expected === actual ? "correct" : "incorrect" };
}

export function gradeQuestion(
  question: Question,
  userAnswer: unknown,
): GradingResult {
  if (!hasAnswerKey(question)) {
    return {
      status: hasUserAnswer(userAnswer) ? "ungraded" : "unanswered",
    };
  }

  if (!hasUserAnswer(userAnswer)) {
    return { status: "unanswered" };
  }

  const type = normalizeQuestionType(question.type);
  if (!isSupportedQuestionType(type)) {
    return { status: "ungraded" };
  }

  switch (type) {
    case "single_choice":
      return gradeSingleChoice(question, userAnswer);
    case "multiple_choice":
      return gradeMultipleChoice(question, userAnswer);
    case "true_false":
      return gradeTrueFalse(question, userAnswer);
    case "short_answer":
      return gradeShortAnswer(question, userAnswer);
    case "numeric":
      return gradeNumeric(question, userAnswer);
    default:
      return { status: "ungraded" };
  }
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
    return undefined;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "no") {
    return false;
  }
  return undefined;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
