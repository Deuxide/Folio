import type { StudySession } from "@/types/session";

export function subjectScopeId(subjectKey: string): string {
  return `subject:${subjectKey}`;
}

export function isSubjectSession(session: StudySession): boolean {
  return session.kind === "subject" || Boolean(session.subjectKey);
}

export function sessionSetupPath(session: StudySession): string {
  if (isSubjectSession(session) && session.subjectKey) {
    return `/subjects/${encodeURIComponent(session.subjectKey)}/setup`;
  }
  return `/sets/${session.questionSetId}/setup`;
}

export function sessionStudyPath(session: StudySession): string {
  if (isSubjectSession(session) && session.subjectKey) {
    return `/subjects/${encodeURIComponent(session.subjectKey)}/study`;
  }
  return `/sets/${session.questionSetId}/study`;
}

export function sessionCompletePath(session: StudySession): string {
  if (isSubjectSession(session) && session.subjectKey) {
    return `/subjects/${encodeURIComponent(session.subjectKey)}/complete`;
  }
  return `/sets/${session.questionSetId}/complete`;
}

export function sessionExitPath(session: StudySession): string {
  if (isSubjectSession(session)) {
    return "/statistics";
  }
  return `/sets/${session.questionSetId}`;
}

export function questionSourceLabel(session: StudySession, questionId: string): string | undefined {
  if (!isSubjectSession(session)) {
    return undefined;
  }
  const setId = session.questionSourceSetIds?.[questionId];
  const bank = setId ? session.sourceSetTitles?.[setId] : undefined;
  if (session.subjectName && bank) {
    return `${session.subjectName} · ${bank}`;
  }
  return bank ?? session.subjectName;
}
