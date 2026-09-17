import { getDb, STUDY_EVENTS_STORE } from "@/lib/db";
import type { StudyEvent } from "@/types/scheduler";

export class StudyEventRepositoryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StudyEventRepositoryError";
  }
}

export const StudyEventRepository = {
  async getAll(): Promise<StudyEvent[]> {
    try {
      const db = await getDb();
      const events = await db.getAll(STUDY_EVENTS_STORE);
      return events.sort((left, right) => left.startAt.localeCompare(right.startAt));
    } catch (cause) {
      throw new StudyEventRepositoryError(
        "Unable to load your study schedule from this device.",
        { cause },
      );
    }
  },

  async getById(id: string): Promise<StudyEvent | undefined> {
    try {
      const db = await getDb();
      return db.get(STUDY_EVENTS_STORE, id);
    } catch (cause) {
      throw new StudyEventRepositoryError("Unable to open this study event.", {
        cause,
      });
    }
  },

  async save(event: StudyEvent): Promise<StudyEvent> {
    try {
      const db = await getDb();
      await db.put(STUDY_EVENTS_STORE, event);
      return event;
    } catch (cause) {
      throw new StudyEventRepositoryError(
        "Unable to save this study event on this device.",
        { cause },
      );
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const db = await getDb();
      await db.delete(STUDY_EVENTS_STORE, id);
    } catch (cause) {
      throw new StudyEventRepositoryError("Unable to delete this study event.", {
        cause,
      });
    }
  },
};
