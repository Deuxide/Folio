import { getDb, QUESTION_SETS_STORE } from "@/lib/db";
import type { QuestionSet } from "@/types/question";
import type { DifficultyRating } from "@/types/session";

export class QuestionSetRepositoryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "QuestionSetRepositoryError";
  }
}

export const QuestionSetRepository = {
  async getAll(): Promise<QuestionSet[]> {
    try {
      const db = await getDb();
      const sets = await db.getAll(QUESTION_SETS_STORE);
      return sets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch (cause) {
      throw new QuestionSetRepositoryError(
        "Unable to load question sets from this device.",
        { cause },
      );
    }
  },

  async getById(id: string): Promise<QuestionSet | undefined> {
    try {
      const db = await getDb();
      return db.get(QUESTION_SETS_STORE, id);
    } catch (cause) {
      throw new QuestionSetRepositoryError(
        "Unable to open this question set.",
        { cause },
      );
    }
  },

  async create(questionSet: QuestionSet): Promise<QuestionSet> {
    try {
      const db = await getDb();
      const existing = await db.get(QUESTION_SETS_STORE, questionSet.id);
      if (existing) {
        throw new QuestionSetRepositoryError(
          "A question set with this ID is already saved on this device.",
        );
      }
      await db.put(QUESTION_SETS_STORE, questionSet);
      return questionSet;
    } catch (cause) {
      if (cause instanceof QuestionSetRepositoryError) {
        throw cause;
      }
      throw new QuestionSetRepositoryError(
        "Unable to save the question set on this device.",
        { cause },
      );
    }
  },

  async update(questionSet: QuestionSet): Promise<QuestionSet> {
    try {
      const db = await getDb();
      const existing = await db.get(QUESTION_SETS_STORE, questionSet.id);
      if (!existing) {
        throw new QuestionSetRepositoryError(
          "This question set could not be found on this device.",
        );
      }
      const next: QuestionSet = {
        ...existing,
        ...questionSet,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      if (!questionSet.subject) {
        delete next.subject;
      }
      await db.put(QUESTION_SETS_STORE, next);
      return next;
    } catch (cause) {
      if (cause instanceof QuestionSetRepositoryError) {
        throw cause;
      }
      throw new QuestionSetRepositoryError(
        "Unable to update this question set.",
        { cause },
      );
    }
  },

  async updateFromImport(
    existing: QuestionSet,
    incoming: QuestionSet,
  ): Promise<QuestionSet> {
    // Re-import "update in place": the file is the source of truth for
    // question content (ids must stay stable so existing attempts keep
    // resolving), but identity fields (`id`, `createdAt`) and omitted
    // optional metadata (subject, description, topic) are preserved rather
    // than silently dropped.
    const next: QuestionSet = {
      ...existing,
      ...incoming,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    if (!incoming.subject && existing.subject) {
      next.subject = existing.subject;
    }
    if (!incoming.description && existing.description) {
      next.description = existing.description;
    }
    await this.update(next);
    return next;
  },

  async updateQuestionDifficulty(
    questionSetId: string,
    questionId: string,
    difficulty: DifficultyRating | undefined,
  ): Promise<QuestionSet | undefined> {
    const existing = await this.getById(questionSetId);
    if (!existing) {
      return undefined;
    }

    const questions = existing.questions.map((question) => {
      if (question.id !== questionId) {
        return question;
      }
      const next = { ...question };
      if (difficulty) {
        next.difficulty = difficulty;
      } else {
        delete next.difficulty;
      }
      return next;
    });

    return this.update({ ...existing, questions });
  },

  async delete(id: string): Promise<void> {
    try {
      const db = await getDb();
      await db.delete(QUESTION_SETS_STORE, id);
    } catch (cause) {
      throw new QuestionSetRepositoryError(
        "Unable to delete this question set.",
        { cause },
      );
    }
  },
};
