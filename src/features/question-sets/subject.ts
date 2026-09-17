export const UNCATEGORIZED_SUBJECT = "Uncategorized";

export function normalizeSubjectKey(subject?: string): string {
  const trimmed = subject?.trim();
  return trimmed ? trimmed.toLowerCase() : UNCATEGORIZED_SUBJECT.toLowerCase();
}

export function formatBankSubject(subject?: string): string {
  const trimmed = subject?.trim();
  return trimmed ? trimmed : UNCATEGORIZED_SUBJECT;
}
