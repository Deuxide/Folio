import { getDb, STUDY_SESSIONS_STORE } from "@/lib/db";
import type { StudySession } from "@/types/session";

export class SessionRepositoryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SessionRepositoryError";
  }
}

export const SessionRepository = {
  async getAll(): Promise<StudySession[]> {
    try {
      const db = await getDb();
      return db.getAll(STUDY_SESSIONS_STORE);
    } catch (cause) {
      throw new SessionRepositoryError(
        "Unable to load study history from this device.",
        { cause },
      );
    }
  },

  async getCompleted(): Promise<StudySession[]> {
    const sessions = await this.getAll();
    return sessions
      .filter((session) => session.status === "completed")
      .sort((left, right) =>
        (right.completedAt ?? right.startedAt).localeCompare(
          left.completedAt ?? left.startedAt,
        ),
      );
  },

  async getById(id: string): Promise<StudySession | undefined> {
    try {
      const db = await getDb();
      return db.get(STUDY_SESSIONS_STORE, id);
    } catch (cause) {
      throw new SessionRepositoryError("Unable to load the study session.", {
        cause,
      });
    }
  },

  async getByQuestionSetId(questionSetId: string): Promise<StudySession[]> {
    try {
      const db = await getDb();
      return db.getAllFromIndex(
        STUDY_SESSIONS_STORE,
        "by-questionSetId",
        questionSetId,
      );
    } catch (cause) {
      throw new SessionRepositoryError(
        "Unable to load study sessions for this question set.",
        { cause },
      );
    }
  },

  async getInProgressByQuestionSetId(
    questionSetId: string,
  ): Promise<StudySession | undefined> {
    const sessions = await this.getByQuestionSetId(questionSetId);
    return sessions
      .filter((session) => session.status === "in_progress")
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  },

  async getLatestByQuestionSetId(
    questionSetId: string,
  ): Promise<StudySession | undefined> {
    const sessions = await this.getByQuestionSetId(questionSetId);
    return sessions.sort((a, b) => {
      const aTime = a.completedAt ?? a.startedAt;
      const bTime = b.completedAt ?? b.startedAt;
      return bTime.localeCompare(aTime);
    })[0];
  },

  async save(session: StudySession): Promise<StudySession> {
    try {
      const db = await getDb();
      await db.put(STUDY_SESSIONS_STORE, session);
      return session;
    } catch (cause) {
      throw new SessionRepositoryError(
        "Unable to save the study session on this device.",
        { cause },
      );
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const db = await getDb();
      await db.delete(STUDY_SESSIONS_STORE, id);
    } catch (cause) {
      throw new SessionRepositoryError("Unable to remove the study session.", {
        cause,
      });
    }
  },

  async getInProgressBySubjectKey(
    subjectKey: string,
  ): Promise<StudySession | undefined> {
    const sessions = await this.getAll();
    return sessions
      .filter(
        (session) =>
          session.status === "in_progress" && session.subjectKey === subjectKey,
      )
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0];
  },

  async getCompletedBySubjectKey(subjectKey: string): Promise<StudySession[]> {
    const sessions = await this.getCompleted();
    return sessions.filter((session) => session.subjectKey === subjectKey);
  },

  async deleteInProgressForSubject(subjectKey: string): Promise<void> {
    const sessions = await this.getAll();
    const active = sessions.filter(
      (session) =>
        session.status === "in_progress" && session.subjectKey === subjectKey,
    );
    await Promise.all(active.map((session) => this.delete(session.id)));
  },

  async deleteInProgressForQuestionSet(questionSetId: string): Promise<void> {
    const sessions = await this.getByQuestionSetId(questionSetId);
    const active = sessions.filter((session) => session.status === "in_progress");
    await Promise.all(active.map((session) => this.delete(session.id)));
  },
};
