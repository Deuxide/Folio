import {
  findOption,
  formatOptionLabel,
  getNormalizedOptions,
} from "@/features/questions/media";
import {
  isSupportedQuestionType,
  normalizeQuestionType,
} from "@/features/questions/normalizeQuestionType";
import type { Question } from "@/types/question";

export function formatAnswerValue(
  question: Question,
  value: unknown,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const type = normalizeQuestionType(question.type);

  if (type === "true_false") {
    if (value === true || value === "true") {
      return "True";
    }
    if (value === false || value === "false") {
      return "False";
    }
  }

  const options = getNormalizedOptions(question);

  if (Array.isArray(value)) {
    const labels = value.map((item) => {
      const option = findOption(options, item);
      if (option) {
        return formatOptionLabel(option);
      }
      return typeof item === "string" ? item : String(item);
    });
    return labels.join(", ");
  }

  const option = findOption(options, value);
  if (option) {
    return formatOptionLabel(option);
  }

  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

export function formatCorrectAnswer(question: Question): string | undefined {
  if (question.answer === undefined || question.answer === null) {
    return undefined;
  }
  const label = formatAnswerValue(question, question.answer);
  const type = normalizeQuestionType(question.type);
  const unit =
    type === "numeric" && typeof question.unit === "string"
      ? question.unit.trim()
      : "";
  if (
    label !== undefined &&
    unit &&
    // Guard against units that are already part of a string answer key.
    !label.toLowerCase().endsWith(unit.toLowerCase())
  ) {
    return `${label} ${unit}`;
  }
  return label;
}

export function isQuestionGradable(question: Question): boolean {
  return (
    question.answer !== undefined &&
    question.answer !== null &&
    isSupportedQuestionType(normalizeQuestionType(question.type))
  );
}
