export type SupportedQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "numeric";

const TYPE_ALIASES: Record<string, SupportedQuestionType> = {
  single_choice: "single_choice",
  multiple_choice: "multiple_choice",
  true_false: "true_false",
  short_answer: "short_answer",
  numeric: "numeric",
  number: "numeric",
  boolean: "true_false",
};

export function normalizeQuestionType(
  type: string,
): SupportedQuestionType | string {
  const normalized = type.trim().toLowerCase().replace(/[-\s]+/g, "_");
  return TYPE_ALIASES[normalized] ?? normalized;
}

export function isSupportedQuestionType(
  type: string,
): type is SupportedQuestionType {
  const normalized = normalizeQuestionType(type);
  return (
    normalized === "single_choice" ||
    normalized === "multiple_choice" ||
    normalized === "true_false" ||
    normalized === "short_answer" ||
    normalized === "numeric"
  );
}
