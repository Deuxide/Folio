import type { DifficultyRating } from "@/types/session";

export type QuestionImage = {
  src: string;
  alt?: string;
};

export type Question = {
  id: string;
  question: string;
  type: string;
  options?: unknown;
  answer?: unknown;
  /** Additional accepted answers for short_answer questions. */
  acceptedAnswers?: string[];
  /** Absolute numeric tolerance: |actual − answer| ≤ tolerance grades correct. */
  tolerance?: number;
  /** Relative tolerance as a fraction of the answer (0.01 = ±1%). */
  relativeTolerance?: number;
  /** Expected unit for numeric answers, e.g. "m/s". Display-only unless typed. */
  unit?: string;
  /** Opt-in partial credit for multiple_choice (default is all-or-nothing). */
  partialCredit?: boolean;
  explanation?: string;
  subject?: string;
  topic?: string;
  tags?: string[];
  images?: QuestionImage[];
  difficulty?: DifficultyRating;
};

export type QuestionSet = {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
};

export type ImportedQuestion = {
  id?: unknown;
  question?: unknown;
  type?: unknown;
  options?: unknown;
  answer?: unknown;
  acceptedAnswers?: unknown;
  tolerance?: unknown;
  relativeTolerance?: unknown;
  unit?: unknown;
  partialCredit?: unknown;
  explanation?: unknown;
  subject?: unknown;
  topic?: unknown;
  tags?: unknown;
  image?: unknown;
  images?: unknown;
  questionImage?: unknown;
  questionImages?: unknown;
  difficulty?: unknown;
};

export type ImportedQuestionSet = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  subject?: unknown;
  questions?: unknown;
};
