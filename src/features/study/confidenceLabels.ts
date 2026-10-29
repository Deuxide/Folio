import type { ConfidenceRating } from "@/types/session";

const CONFIDENCE_LABEL: Record<ConfidenceRating, string> = {
  sure: "Confident",
  unsure: "Unsure",
  guessed: "Guessed",
};

export function confidenceLabel(rating: ConfidenceRating): string {
  return CONFIDENCE_LABEL[rating];
}
