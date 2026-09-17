import type { DifficultyRating } from "@/types/session";

const RATINGS: DifficultyRating[] = ["easy", "medium", "hard"];

export function parseDifficulty(value: unknown): DifficultyRating | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return RATINGS.find((rating) => rating === normalized);
}

export function formatDifficulty(value: DifficultyRating): string {
  if (value === "easy") {
    return "Easy";
  }
  if (value === "medium") {
    return "Medium";
  }
  return "Hard";
}
