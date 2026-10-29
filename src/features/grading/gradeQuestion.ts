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
import {
  normalizeShortAnswer,
  normalizeShortAnswers,
  parseNumericValue,
  stripUnitSuffix,
} from "@/features/grading/normalize";
import type { GradingResult, GradingStatus } from "@/types/grading";
import type { Question } from "@/types/question";

export type { GradingResult, GradingStatus };

/**
 * Which grading rules apply.
 *
 * - `enhanced`: current rules — forgiving short-answer normalization,
 *   numeric tolerance/units, optional partial credit.
 * - `legacy`: the exact pre-upgrade rules, used when finishing a session
 *   that was started before these rules existed so historical data is never
 *   re-graded. Questions carrying the new optional fields (`acceptedAnswers`,
 *   `tolerance`, `relativeTolerance`, `unit`, `partialCredit`) could not
 *   exist in such sessions, so legacy grading is always faithful.
 */
export type GradingMode = "enhanced" | "legacy";

export type GradingOptions = {
  grading?: GradingMode;
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
  grading: GradingMode = "enhanced",
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

  const isFullMatch =
    expectedIds.size === selectedIds.size &&
    [...expectedIds].every((id) => selectedIds.has(id));

  if (isFullMatch) {
    return { status: "correct" };
  }

  // Partial credit is opt-in per question and only exists for enhanced
  // grading; legacy sessions stay strictly all-or-nothing.
  if (grading === "enhanced" && question.partialCredit === true) {
    const hits = [...expectedIds].filter((id) => selectedIds.has(id)).length;
    const falsePositives = [...selectedIds].filter(
      (id) => !expectedIds.has(id),
    ).length;
    const credit = Math.max(
      0,
      Math.round(((hits - falsePositives) / expectedIds.size) * 100) / 100,
    );
    return { status: "incorrect", credit };
  }

  return { status: "incorrect" };
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
  grading: GradingMode = "enhanced",
): GradingResult {
  if (typeof question.answer !== "string") {
    return { status: "ungraded" };
  }
  if (typeof userAnswer !== "string") {
    return { status: "incorrect" };
  }

  if (grading === "legacy") {
    const correct =
      question.answer.trim().toLowerCase() ===
      userAnswer.trim().toLowerCase();
    return { status: correct ? "correct" : "incorrect" };
  }

  const keys = normalizeShortAnswerKeys(question.answer, question.acceptedAnswers);
  const actual = normalizeShortAnswer(userAnswer);
  if (!actual) {
    return { status: "incorrect" };
  }
  return {
    status: keys.includes(actual) ? "correct" : "incorrect",
  };
}

function normalizeShortAnswerKeys(
  answerKey: unknown,
  acceptedAnswers: unknown,
): string[] {
  const keys: string[] = [];
  if (typeof answerKey === "string") {
    keys.push(normalizeShortAnswer(answerKey));
  }
  for (const extra of normalizeShortAnswers(acceptedAnswers)) {
    if (!keys.includes(extra)) {
      keys.push(extra);
    }
  }
  return keys;
}

export function gradeNumeric(
  question: Question,
  userAnswer: unknown,
  grading: GradingMode = "enhanced",
): GradingResult {
  // Legacy keeps the original key parser so legacy string keys ("84,5")
  // that never parsed continue to grade as ungraded, exactly as before.
  const expected =
    grading === "legacy"
      ? toFiniteNumber(question.answer)
      : parseNumericValue(question.answer);
  if (expected === undefined) {
    return { status: "ungraded" };
  }

  if (grading === "legacy") {
    const actual = toFiniteNumber(userAnswer);
    if (actual === undefined) {
      return { status: "incorrect" };
    }
    return { status: expected === actual ? "correct" : "incorrect" };
  }

  const actual = parseTypedNumeric(userAnswer, question.unit);
  if (actual === undefined) {
    return { status: "incorrect" };
  }

  const tolerance = numericTolerance(question, expected);
  return {
    status: Math.abs(actual - expected) <= tolerance ? "correct" : "incorrect",
  };
}

function parseTypedNumeric(
  userAnswer: unknown,
  unit: string | undefined,
): number | undefined {
  if (typeof userAnswer !== "string") {
    return parseNumericValue(userAnswer);
  }
  if (!unit) {
    return parseNumericValue(userAnswer);
  }
  // Accept the value with or without the expected unit tacked on. If the
  // unit-stripped text is not a number, fall back to the raw text.
  const stripped = stripUnitSuffix(userAnswer, unit);
  const parsed = parseNumericValue(stripped);
  return parsed === undefined ? parseNumericValue(userAnswer) : parsed;
}

function numericTolerance(question: Question, expected: number): number {
  if (
    typeof question.tolerance === "number" &&
    Number.isFinite(question.tolerance)
  ) {
    return Math.abs(question.tolerance);
  }
  if (
    typeof question.relativeTolerance === "number" &&
    Number.isFinite(question.relativeTolerance)
  ) {
    return Math.abs(question.relativeTolerance) * Math.abs(expected);
  }
  return 0;
}

export function gradeQuestion(
  question: Question,
  userAnswer: unknown,
  options?: GradingOptions,
): GradingResult {
  if (!hasAnswerKey(question)) {
    return {
      status: hasUserAnswer(userAnswer) ? "ungraded" : "unanswered",
    };
  }

  if (!hasUserAnswer(userAnswer)) {
    return { status: "unanswered" };
  }

  const grading = options?.grading ?? "enhanced";
  const type = normalizeQuestionType(question.type);
  if (!isSupportedQuestionType(type)) {
    return { status: "ungraded" };
  }

  switch (type) {
    case "single_choice":
      return gradeSingleChoice(question, userAnswer);
    case "multiple_choice":
      return gradeMultipleChoice(question, userAnswer, grading);
    case "true_false":
      return gradeTrueFalse(question, userAnswer);
    case "short_answer":
      return gradeShortAnswer(question, userAnswer, grading);
    case "numeric":
      return gradeNumeric(question, userAnswer, grading);
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
