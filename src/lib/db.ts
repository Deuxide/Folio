import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { QuestionSet } from "@/types/question";
import type { StudySession } from "@/types/session";

const DB_NAME = "folio-study";
const DB_VERSION = 2;
const QUESTION_SETS_STORE = "questionSets";
const STUDY_SESSIONS_STORE = "studySessions";

interface FolioDB extends DBSchema {
  questionSets: {
    key: string;
    value: QuestionSet;
    indexes: { "by-updatedAt": string };
  };
  studySessions: {
    key: string;
    value: StudySession;
    indexes: {
      "by-questionSetId": string;
      "by-status": string;
      "by-startedAt": string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<FolioDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<FolioDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FolioDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(QUESTION_SETS_STORE)) {
          const store = database.createObjectStore(QUESTION_SETS_STORE, {
            keyPath: "id",
          });
          store.createIndex("by-updatedAt", "updatedAt");
        }

        if (!database.objectStoreNames.contains(STUDY_SESSIONS_STORE)) {
          const sessions = database.createObjectStore(STUDY_SESSIONS_STORE, {
            keyPath: "id",
          });
          sessions.createIndex("by-questionSetId", "questionSetId");
          sessions.createIndex("by-status", "status");
          sessions.createIndex("by-startedAt", "startedAt");
        }
      },
    });
  }

  return dbPromise;
}

export { QUESTION_SETS_STORE, STUDY_SESSIONS_STORE };
