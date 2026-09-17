export type StudyEventStatus = "todo" | "in_progress" | "done";
export type StudyEventPriority = "low" | "medium" | "high";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly";
export type RecurrenceEditMode = "series" | "occurrence";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number[];
  endDate?: string;
};

export type StudyAction =
  | {
      type: "question_bank";
      questionSetId: string;
    }
  | {
      type: "subject_test";
      subjectKey: string;
    };

export type StudyEvent = {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  startAt: string;
  endAt?: string;
  allDay: boolean;
  status: StudyEventStatus;
  priority: StudyEventPriority;
  reminderMinutes?: number[];
  recurrence?: RecurrenceRule | null;
  exceptionDates?: string[];
  seriesId?: string;
  studyAction?: StudyAction | null;
  createdAt: string;
  updatedAt: string;
};

export type StudyOccurrence = {
  source: StudyEvent;
  startAt: string;
  endAt?: string;
  dateKey: string;
};

export type StudyEventDraft = {
  title: string;
  description: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  priority: StudyEventPriority;
  status: StudyEventStatus;
  reminderMinutes: number[];
  repeats: boolean;
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek: number[];
  ends: boolean;
  endDate: string;
  studyKind: "none" | "question_bank" | "subject_test";
  questionSetId: string;
  subjectKey: string;
};
