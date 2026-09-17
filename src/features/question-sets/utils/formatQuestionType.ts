export function formatQuestionType(type: string): string {
  const cleaned = type.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!cleaned) {
    return "Unknown type";
  }

  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getQuestionSetSubjects(
  questions: { subject?: string }[],
): string | undefined {
  const subjects = [
    ...new Set(
      questions
        .map((question) => question.subject)
        .filter((subject): subject is string => Boolean(subject)),
    ),
  ];

  if (subjects.length === 0) {
    return undefined;
  }

  return subjects.slice(0, 3).join(" · ");
}

export function formatQuestionCount(count: number): string {
  return count === 1 ? "1 question" : `${count} questions`;
}
