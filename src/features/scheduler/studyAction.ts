import { normalizeSubjectKey } from "@/features/question-sets/subject";
import { StudyEventRepository } from "@/repositories/StudyEventRepository";
import type { QuestionSet } from "@/types/question";
import type { StudyAction, StudyEvent } from "@/types/scheduler";

export function studyActionLabel(action: StudyAction | null | undefined): string | undefined {
  if (!action) {
    return undefined;
  }
  return action.type === "question_bank" ? "Question bank" : "Subject test";
}

export function resolveStudyAction(
  action: StudyAction | null | undefined,
  sets: QuestionSet[],
):
  | { ok: true; action: StudyAction; href: string; detail: string }
  | { ok: false; reason: string }
  | null {
  if (!action) {
    return null;
  }
  if (action.type === "question_bank") {
    const set = sets.find((item) => item.id === action.questionSetId);
    if (!set) {
      return {
        ok: false,
        reason: "The question bank associated with this event no longer exists.",
      };
    }
    return {
      ok: true,
      action,
      href: `/sets/${set.id}/setup`,
      detail: set.subject ? `${set.subject} — ${set.title}` : set.title,
    };
  }
  const match = sets.find(
    (item) => normalizeSubjectKey(item.subject) === action.subjectKey,
  );
  if (!match) {
    return {
      ok: false,
      reason: "No question banks are available for this subject anymore.",
    };
  }
  return {
    ok: true,
    action,
    href: `/subjects/${encodeURIComponent(action.subjectKey)}/setup`,
    detail: match.subject?.trim() || action.subjectKey,
  };
}

export async function markScheduledEventStatus(
  eventId: string | undefined,
  status: StudyEvent["status"],
) {
  if (!eventId) {
    return;
  }
  try {
    const event = await StudyEventRepository.getById(eventId);
    if (!event) {
      return;
    }
    await StudyEventRepository.save({
      ...event,
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Planning status should never block studying.
  }
}

export function withEventQuery(href: string, eventId: string): string {
  const glue = href.includes("?") ? "&" : "?";
  return `${href}${glue}event=${encodeURIComponent(eventId)}`;
}
