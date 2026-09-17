import type { Question } from "@/types/question";
import type { DifficultyRating } from "@/types/session";

export const DIFFICULTY_SCORE: Record<DifficultyRating, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export type DifficultyBreakdown = {
  easy: number;
  medium: number;
  hard: number;
  unrated: number;
  rated: number;
  total: number;
};

export type DifficultySummary = DifficultyBreakdown & {
  average: number | null;
  label: string;
};

export function summarizeQuestionDifficulty(
  questions: Question[],
): DifficultySummary {
  const breakdown: DifficultyBreakdown = {
    easy: 0,
    medium: 0,
    hard: 0,
    unrated: 0,
    rated: 0,
    total: questions.length,
  };

  let scoreTotal = 0;

  for (const question of questions) {
    if (question.difficulty === "easy") {
      breakdown.easy += 1;
      breakdown.rated += 1;
      scoreTotal += DIFFICULTY_SCORE.easy;
    } else if (question.difficulty === "medium") {
      breakdown.medium += 1;
      breakdown.rated += 1;
      scoreTotal += DIFFICULTY_SCORE.medium;
    } else if (question.difficulty === "hard") {
      breakdown.hard += 1;
      breakdown.rated += 1;
      scoreTotal += DIFFICULTY_SCORE.hard;
    } else {
      breakdown.unrated += 1;
    }
  }

  const average =
    breakdown.rated > 0
      ? Math.round((scoreTotal / breakdown.rated) * 10) / 10
      : null;

  return {
    ...breakdown,
    average,
    label: averageLabel(average),
  };
}

export function formatDifficultyAverage(average: number | null): string {
  if (average === null) {
    return "Not rated yet";
  }
  return `${average.toFixed(1)} / 3`;
}

export function averageLabel(average: number | null): string {
  if (average === null) {
    return "Not rated yet";
  }
  if (average <= 1.4) {
    return "Mostly Easy";
  }
  if (average <= 1.8) {
    return "Easy–Medium";
  }
  if (average <= 2.2) {
    return "Mostly Medium";
  }
  if (average <= 2.6) {
    return "Medium–Hard";
  }
  return "Mostly Hard";
}
