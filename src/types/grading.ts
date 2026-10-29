export type GradingStatus =
  | "correct"
  | "incorrect"
  | "ungraded"
  | "unanswered";

/**
 * Outcome of grading a single answer. `credit` carries optional partial credit
 * (0–1) for multiple-choice questions that opt in via `question.partialCredit`.
 * Sessions completed before this field existed never carry `credit`.
 */
export type GradingResult = {
  status: GradingStatus;
  credit?: number;
};
