import { getDb, QUESTION_MEMORY_STORE } from "@/lib/db";
import type { QuestionMemory } from "@/types/mastery";

export class QuestionMemoryRepositoryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "QuestionMemoryRepositoryError";
  }
}

/**
 * Per-question spaced-repetition state. `bulkPut` is used by the finalize
 * pipeline so a completed session lands all of its question updates in a
 * single transaction.
 */
export const QuestionMemoryRepository = {
  async getAll(): Promise<QuestionMemory[]> {
    try {
      const db = await getDb();
      return db.getAll(QUESTION_MEMORY_STORE);
    } catch (cause) {
      throw new QuestionMemoryRepositoryError(
        "Unable to load learning progress from this device.",
        { cause },
      );
    }
  },

  async getByQuestionId(
    questionId: string,
  ): Promise<QuestionMemory | undefined> {
    try {
      const db = await getDb();
      return db.get(QUESTION_MEMORY_STORE, questionId);
    } catch (cause) {
      throw new QuestionMemoryRepositoryError(
        "Unable to load learning progress for this question.",
        { cause },
      );
    }
  },

  async getMany(questionIds: string[]): Promise<Map<string, QuestionMemory>> {
    const found = new Map<string, QuestionMemory>();
    if (questionIds.length === 0) {
      return found;
    }
    try {
      const db = await getDb();
      const tx = db.transaction(QUESTION_MEMORY_STORE, "readonly");
      for (const questionId of new Set(questionIds)) {
        const record = await tx.store.get(questionId);
        if (record) {
          found.set(questionId, record);
        }
      }
      await tx.done;
      return found;
    } catch (cause) {
      throw new QuestionMemoryRepositoryError(
        "Unable to load learning progress for these questions.",
        { cause },
      );
    }
  },

  async put(memory: QuestionMemory): Promise<void> {
    try {
      const db = await getDb();
      await db.put(QUESTION_MEMORY_STORE, memory);
    } catch (cause) {
      throw new QuestionMemoryRepositoryError(
        "Unable to save learning progress on this device.",
        { cause },
      );
    }
  },

  async bulkPut(memories: QuestionMemory[]): Promise<void> {
    if (memories.length === 0) {
      return;
    }
    try {
      const db = await getDb();
      const tx = db.transaction(QUESTION_MEMORY_STORE, "readwrite");
      for (const memory of memories) {
        tx.store.put(memory);
      }
      await tx.done;
    } catch (cause) {
      throw new QuestionMemoryRepositoryError(
        "Unable to save learning progress on this device.",
        { cause },
      );
    }
  },

  async clearAll(): Promise<void> {
    try {
      const db = await getDb();
      await db.clear(QUESTION_MEMORY_STORE);
    } catch (cause) {
      throw new QuestionMemoryRepositoryError(
        "Unable to clear learning progress on this device.",
        { cause },
      );
    }
  },
};
