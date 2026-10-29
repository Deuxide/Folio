import { describe, expect, it } from "vitest";
import {
  normalizeShortAnswer,
  normalizeShortAnswers,
  parseNumericValue,
  stripUnitSuffix,
} from "../normalize";

describe("normalizeShortAnswer", () => {
  it("folds case, diacritics, and whitespace", () => {
    expect(normalizeShortAnswer("Café  au LAIT")).toBe(
      normalizeShortAnswer("cafe au lait"),
    );
    expect(normalizeShortAnswer("Über")).toBe("uber");
  });

  it("removes prose punctuation but keeps decimals and math symbols", () => {
    expect(normalizeShortAnswer("Hello, world!")).toBe("hello world");
    expect(normalizeShortAnswer("0.5")).toBe("0.5");
    expect(normalizeShortAnswer("x = 2")).toBe(normalizeShortAnswer("x=2"));
    expect(normalizeShortAnswer("5/8")).toBe("5/8");
  });

  it("unifies dash variants and strips trailing punctuation", () => {
    expect(normalizeShortAnswer("well–known—")).toBe("well-known");
    expect(normalizeShortAnswer("The end.")).toBe("the end");
  });

  it("keeps values that only differ by meaningful punctuation distinct", () => {
    expect(normalizeShortAnswer("1.5")).not.toBe(normalizeShortAnswer("15"));
  });

  it("matches quoted and parenthesised prose loosely", () => {
    expect(normalizeShortAnswer('“The Great Gatsby”')).toBe(
      normalizeShortAnswer("the great gatsby"),
    );
    expect(normalizeShortAnswer("(1945)")).toBe("1945");
  });
});

describe("normalizeShortAnswers (accepted answers)", () => {
  it("normalizes an array value and drops duplicates", () => {
    expect(normalizeShortAnswers(["New York", "  NEW YORK "])).toEqual([
      "new york",
    ]);
  });

  it("splits a comma-separated string", () => {
    expect(normalizeShortAnswers("e.g., for example")).toEqual([
      "e.g",
      "for example",
    ]);
    expect(normalizeShortAnswers("ginger, ginger root, GINGERA")).toEqual([
      "ginger",
      "ginger root",
      "gingera",
    ]);
  });

  it("returns an empty list for other types", () => {
    expect(normalizeShortAnswers(42)).toEqual([]);
    expect(normalizeShortAnswers(undefined)).toEqual([]);
  });
});

describe("parseNumericValue", () => {
  it("accepts plain numbers and numeric strings", () => {
    expect(parseNumericValue(84)).toBe(84);
    expect(parseNumericValue("84")).toBe(84);
    expect(parseNumericValue("  -4.25 ")).toBe(-4.25);
    expect(parseNumericValue("1e3")).toBe(1000);
  });

  it("accepts a Unicode minus sign", () => {
    expect(parseNumericValue("−3")).toBe(-3);
  });

  it("parses thousands separators as thousands", () => {
    expect(parseNumericValue("12,000")).toBe(12000);
    expect(parseNumericValue("1,234")).toBe(1234);
  });

  it("parses unambiguous decimal commas", () => {
    expect(parseNumericValue("84,5")).toBe(84.5);
  });

  it("rejects non-numeric input", () => {
    expect(parseNumericValue("abc")).toBeUndefined();
    expect(parseNumericValue("")).toBeUndefined();
    expect(parseNumericValue(null)).toBeUndefined();
    expect(parseNumericValue(Number.NaN)).toBeUndefined();
  });
});

describe("stripUnitSuffix", () => {
  it("removes a spaced or glued expected unit", () => {
    expect(stripUnitSuffix("84 kg", "kg")).toBe("84");
    expect(stripUnitSuffix("84kg", "kg")).toBe("84");
    expect(stripUnitSuffix("84 KM/H", "km/h")).toBe("84");
  });

  it("returns the raw text when the unit does not match", () => {
    expect(stripUnitSuffix("84 g", "kg")).toBe("84 g");
  });

  it("does nothing without a unit", () => {
    expect(stripUnitSuffix("84", undefined)).toBe("84");
  });
});
