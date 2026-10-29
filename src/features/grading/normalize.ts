/**
 * Text normalization helpers for forgiving answer matching.
 *
 * Normalization is deliberately conservative: punctuation that can carry
 * meaning in study answers (`.`, `-`, `+`, `/`, `=`, `%`, `°`, `$`, letters,
 * digits) is preserved so that values such as "0.5", "x=2", "5/8", and "−3"
 * are not distorted. Everything else — case, typographic dash/quote
 * variants, diacritics, prose punctuation, and runs of whitespace — is
 * folded away.
 */

/**
 * Characters removed before matching: quote variants, brackets, list
 * punctuation, and sentence punctuation. Kept out of removal on purpose:
 * periods/dashes in numbers, `/` in units, `=`, `+`, `%`, `°`, `$`.
 */
const IGNORABLE_CHARS =
  /[""'‘‛“”„‚«»‹›(){}[\],;:!?¡¿*\u2026]/g;

const WHITESPACE_RUN = /\s+/g;

/** Dash characters that should be treated as a plain hyphen/minus. */
const DASH_CHARS = /[\u2010-\u2015\u2212]/g;

/** Operators whose surrounding spaces are stripped ("x = 2" → "x=2"). */
const SPACED_OPERATOR = /\s*([=+/%\u2212-])\s*/g;

const TRAILING_PUNCTUATION = /\s*[.,;:!?-]+\s*$/;

export function foldDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

function canonicalize(value: string): string {
  return foldDiacritics(value)
    .toLowerCase()
    .replace(DASH_CHARS, "-")
    .replace(IGNORABLE_CHARS, " ")
    .replace(WHITESPACE_RUN, " ")
    .trim()
    .replace(SPACED_OPERATOR, "$1")
    .replace(TRAILING_PUNCTUATION, "")
    .trim();
}

/**
 * Normalizes a single short-answer string. Example:
 * "Café — the BEST!" and "cafe the best" both produce "cafe the best".
 */
export function normalizeShortAnswer(raw: string): string {
  return canonicalize(raw);
}

/**
 * Normalizes a question's accepted-answers value: either an array of
 * strings, a comma-separated string, or `undefined`. Duplicates and blanks
 * are dropped. Each entry is normalized in its own right.
 */
export function normalizeShortAnswers(values: unknown): string[] {
  const raw: unknown[] =
    typeof values === "string"
      ? values.split(",")
      : Array.isArray(values)
        ? values
        : [];

  const normalized: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") {
      continue;
    }
    const folded = canonicalize(item);
    if (folded && !normalized.includes(folded)) {
      normalized.push(folded);
    }
  }
  return normalized;
}

/**
 * Parses the concrete number behind a typed numeric answer. Accepts plain
 * numbers, exponent notation ("1e3"), thousands separators ("12,000"),
 * decimal commas ("84,5"), and a Unicode minus sign.
 */
export function parseNumericValue(raw: unknown): number | undefined {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : undefined;
  }
  if (typeof raw !== "string") {
    return undefined;
  }

  let text = raw.trim().replace(DASH_CHARS, "-");
  if (!text) {
    return undefined;
  }

  // Thousands separators: optional sign, digits, then groups of exactly
  // three separated by commas.
  if (/(?<=\d)(,\d{3})+$/.test(text)) {
    text = text.replace(/,/g, "");
  } else if (/[+-]?\d+,\d+$/.test(text) && !/^(,\d{3})+$/.test(text.slice(text.indexOf(",") + 1))) {
    // Unambiguous decimal comma ("84,5"). A single comma group of length 3
    // like "1,234" prefers the thousands-separator reading.
    text = text.replace(",", ".");
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
}

/**
 * Removes an expected unit ("m/s", "kg") typed after the value
 * ("84 kg", "84kg", "84 = kg" is not supported). Returns the remaining
 * numeric text for parsing.
 */
export function stripUnitSuffix(raw: string, unit: string | undefined): string {
  const text = raw.trim();
  if (!unit || !text) {
    return text;
  }
  const foldedUnit = escapeRegExp(unit.replace(/\s+/g, ""));
  const suffixWithSpace = new RegExp(`\\s${foldedUnit}$`, "i");
  const suffixGlued = new RegExp(`${foldedUnit}$`, "i");

  if (suffixWithSpace.test(text)) {
    return text.replace(suffixWithSpace, "").trim();
  }
  return text.replace(suffixGlued, "").trim();
}
