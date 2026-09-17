export function hasUserAnswer(userAnswer: unknown): boolean {
  if (userAnswer === undefined || userAnswer === null) {
    return false;
  }

  if (typeof userAnswer === "string") {
    return userAnswer.trim().length > 0;
  }

  if (Array.isArray(userAnswer)) {
    return userAnswer.length > 0;
  }

  if (typeof userAnswer === "boolean" || typeof userAnswer === "number") {
    return true;
  }

  return false;
}
