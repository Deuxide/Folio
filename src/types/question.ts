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
  explanation?: string;
  subject?: string;
  topic?: string;
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
  explanation?: unknown;
  subject?: unknown;
  topic?: unknown;
  image?: unknown;
  images?: unknown;
  difficulty?: unknown;
};

export type ImportedQuestionSet = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  subject?: unknown;
  questions?: unknown;
};
