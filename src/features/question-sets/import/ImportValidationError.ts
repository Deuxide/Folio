export class ImportValidationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    const uniqueProblems = problems.filter(Boolean);
    super("Unable to import question set.");
    this.name = "ImportValidationError";
    this.problems =
      uniqueProblems.length > 0
        ? uniqueProblems
        : ["The file could not be imported."];
  }
}

export function getImportErrorMessage(error: unknown): {
  title: string;
  problems: string[];
} {
  if (error instanceof ImportValidationError) {
    return { title: error.message, problems: error.problems };
  }

  if (error instanceof Error && error.message) {
    return {
      title: "Unable to import question set.",
      problems: [friendlyImportMessage(error.message)],
    };
  }

  return {
    title: "Unable to import question set.",
    problems: ["Something unexpected went wrong while reading this file."],
  };
}

function friendlyImportMessage(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("unexpected token") ||
    lower.includes("json") ||
    lower.includes("position")
  ) {
    return "The file is not valid JSON. Check that it is a complete question-set file and try again.";
  }
  return message;
}
