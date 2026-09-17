import { Fragment, useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

type MathSegment =
  | { kind: "text"; value: string }
  | { kind: "inline" | "block"; value: string };

type MathTextProps = {
  text?: string;
  className?: string;
  as?: "span" | "p" | "div";
};

function splitMath(input: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const rest = input.slice(cursor);
    const blockDollar = rest.startsWith("$$")
      ? rest.indexOf("$$", 2)
      : -1;
    const blockBracket = rest.startsWith("\\[")
      ? rest.indexOf("\\]", 2)
      : -1;
    const inlineParen = rest.startsWith("\\(")
      ? rest.indexOf("\\)", 2)
      : -1;

    if (rest.startsWith("$$") && blockDollar !== -1) {
      segments.push({ kind: "block", value: rest.slice(2, blockDollar) });
      cursor += blockDollar + 2;
      continue;
    }
    if (rest.startsWith("\\[") && blockBracket !== -1) {
      segments.push({ kind: "block", value: rest.slice(2, blockBracket) });
      cursor += blockBracket + 2;
      continue;
    }
    if (rest.startsWith("\\(") && inlineParen !== -1) {
      segments.push({ kind: "inline", value: rest.slice(2, inlineParen) });
      cursor += inlineParen + 2;
      continue;
    }
    if (rest.startsWith("$") && !rest.startsWith("$$")) {
      const end = rest.indexOf("$", 1);
      if (end !== -1) {
        segments.push({ kind: "inline", value: rest.slice(1, end) });
        cursor += end + 1;
        continue;
      }
    }

    const next = nextMathIndex(input, cursor + 1);
    segments.push({ kind: "text", value: input.slice(cursor, next) });
    cursor = next;
  }

  return segments;
}

function nextMathIndex(input: string, from: number): number {
  const markers = ["$$", "\\[", "\\(", "$"];
  let nearest = input.length;
  for (const marker of markers) {
    const index = input.indexOf(marker, from);
    if (index !== -1 && index < nearest) {
      nearest = index;
    }
  }
  return nearest;
}

function renderKatex(expression: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(expression.trim(), {
      displayMode,
      throwOnError: true,
      output: "html",
      strict: "ignore",
    });
  } catch {
    return null;
  }
}

export function MathText({ text, className, as: Tag = "span" }: MathTextProps) {
  const content = text?.trim() ? text : "";
  const segments = useMemo(
    () => (content ? splitMath(content) : []),
    [content],
  );

  if (!content) {
    return null;
  }

  return (
    <Tag className={className}>
      {segments.map((segment, index) => {
        if (segment.kind === "text") {
          return <Fragment key={index}>{segment.value}</Fragment>;
        }
        const html = renderKatex(segment.value, segment.kind === "block");
        if (!html) {
          return (
            <code
              key={index}
              className="rounded bg-muted px-1 py-0.5 text-[0.95em]"
              title="This expression could not be rendered"
            >
              {segment.value}
            </code>
          );
        }
        return (
          <span
            key={index}
            className={
              segment.kind === "block"
                ? "my-2 block overflow-x-auto"
                : "inline-block max-w-full overflow-x-auto align-middle"
            }
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </Tag>
  );
}

export function hasRenderableText(text?: string): boolean {
  return Boolean(text && text.trim().length > 0);
}
