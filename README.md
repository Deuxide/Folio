# Study App

A modern question-practice web app for studying from custom question sets.

## Features

* Import question sets from JSON
* Multiple question types
* Configurable study sessions and timers
* Easy / Medium / Hard self-rating
* Question and answer-option images
* Automatic grading when an answer key is available
* Detailed results and review
* Session history
* Statistics and performance tracking
* Smart practice based on previous performance
* Dark and light themes
* Local data persistence

## Supported Question Types

* `single_choice`
* `multiple_choice`
* `true_false`
* `short_answer`
* `numeric`

---

# JSON Import Format

Question sets are imported as JSON objects.

The current schema supports:

* Question text, images, or both
* Image-only questions
* Text-only questions
* Text + image questions
* Image-only or text + image answer options
* Stable `id` values for questions and options
* LaTeX math in text fields
* Optional answer keys and explanations
* Optional question difficulty
* External image URLs

## Question Set Structure

```json
{
  "title": "Mathematics Test",
  "description": "Example question set",
  "subject": "Mathematics",
  "questions": [
    {
      "id": "q1",
      "question": "What is $2 + 2$?",
      "type": "single_choice",
      "options": [
        {
          "id": "option-a",
          "text": "3"
        },
        {
          "id": "option-b",
          "text": "4"
        },
        {
          "id": "option-c",
          "text": "5"
        }
      ],
      "answer": "option-b",
      "explanation": "$2 + 2 = 4$."
    }
  ]
}
```

## Question Set Fields

| Field | Required | Description |
| --- | --- | --- |
| `title` | Yes | Name of the question set. |
| `description` | No | Optional description. |
| `subject` | No | Subject for the entire question set, such as `Mathematics`, `Physics`, or `English`. Existing sets without a subject remain valid. |
| `questions` | Yes | Array of question objects. |

`subject` belongs to the **question set**, not individual questions.

## Question Fields

| Field | Required | Description |
| --- | --- | --- |
| `id` | No | Stable unique question ID. Generated automatically if omitted. |
| `question` | No* | Question text. Supports LaTeX. |
| `type` | Yes | One of the supported question types. |
| `options` | Depends | Answer options for choice-based questions. |
| `answer` | No | Correct answer. If omitted, the question is not automatically graded. |
| `explanation` | No | Explanation shown during review. Supports LaTeX. |
| `difficulty` | No | `easy`, `medium`, or `hard`. |
| `questionImage` | No | A single question image. |
| `questionImages` | No | Multiple question images. |

\* A question does not need text if it has at least one question image.

Question IDs should be unique within the question set. If an imported question has no ID, the app generates one during normalization/import.

## Question Text and LaTeX

Text fields that are rendered by the app support LaTeX math.

For example:

```json
{
  "question": "Solve $x^2 - 5x + 6 = 0$.",
  "type": "short_answer",
  "answer": "2, 3"
}
```

Inline and block mathematical notation are supported by the app's math renderer. Follow the renderer's supported delimiters when writing generated question banks.

Invalid LaTeX should not make the application crash; it should be handled gracefully.

## Question Images

Questions may use an external image URL. Images can be used together with text or without text.

```json
{
  "id": "q-diagram",
  "question": "What is the value of $x$?",
  "type": "single_choice",
  "questionImages": [
    {
      "src": "https://example.com/diagram.png",
      "alt": "Geometry diagram",
      "caption": "Triangle with a marked angle"
    }
  ],
  "options": [
    {
      "id": "option-a",
      "text": "30°"
    },
    {
      "id": "option-b",
      "text": "45°"
    },
    {
      "id": "option-c",
      "text": "60°"
    }
  ],
  "answer": "option-c"
}
```

An image-only question is also valid:

```json
{
  "id": "q-image-only",
  "type": "single_choice",
  "questionImages": [
    {
      "src": "https://example.com/map.png",
      "alt": "Map of the region"
    }
  ],
  "options": [
    {
      "id": "option-a",
      "image": {
        "src": "https://example.com/a.png",
        "alt": "Option A"
      }
    },
    {
      "id": "option-b",
      "image": {
        "src": "https://example.com/b.png",
        "alt": "Option B"
      }
    }
  ],
  "answer": "option-a"
}
```

Image URLs may be copied from an image's direct address. The app should display broken or unavailable external images gracefully.

## Answer Options

For choice-based questions, each option has a stable unique `id`.

An option may contain:

* `text`
* `image`
* both `text` and `image`

At least one of `text` or `image` must be present.

```json
{
  "id": "option-a",
  "text": "The correct answer"
}
```

Text + image:

```json
{
  "id": "option-b",
  "text": "Option B",
  "image": {
    "src": "https://example.com/option-b.png",
    "alt": "Illustration for option B"
  }
}
```

Image-only:

```json
{
  "id": "option-c",
  "image": {
    "src": "https://example.com/option-c.png",
    "alt": "Option C"
  }
}
```

### Stable Option IDs

`option.id` is the option's primary identity.

Option IDs must be unique within their question and should remain stable after import.

Do not use option text, image URLs, or array position as the primary identity because those values may change.

If an imported question uses options without IDs, the app generates stable IDs during normalization/import. Existing valid IDs should be preserved.

This allows answers, grading, saved attempts, results, and history to continue referring to the same option even when its visible content changes.

## Question Type Examples

### Single Choice

The answer is the ID of the correct option.

```json
{
  "question": "What is $5 \\times 6$?",
  "type": "single_choice",
  "options": [
    { "id": "option-a", "text": "20" },
    { "id": "option-b", "text": "25" },
    { "id": "option-c", "text": "30" },
    { "id": "option-d", "text": "35" }
  ],
  "answer": "option-c"
}
```

### Multiple Choice

`answer` is an array containing the IDs of all correct options.

```json
{
  "question": "Which numbers are even?",
  "type": "multiple_choice",
  "options": [
    { "id": "option-a", "text": "2" },
    { "id": "option-b", "text": "3" },
    { "id": "option-c", "text": "4" },
    { "id": "option-d", "text": "7" }
  ],
  "answer": ["option-a", "option-c"]
}
```

### True / False

```json
{
  "question": "10 is greater than 5.",
  "type": "true_false",
  "options": [
    { "id": "true", "text": "True" },
    { "id": "false", "text": "False" }
  ],
  "answer": true
}
```

### Short Answer

```json
{
  "question": "Simplify: $2x + 3x$.",
  "type": "short_answer",
  "answer": "5x"
}
```

### Numeric

```json
{
  "question": "What is $12 \\times 7$?",
  "type": "numeric",
  "answer": 84
}
```

## Questions Without Answers

The `answer` field is optional.

This is valid:

```json
{
  "question": "Explain why the sky appears blue.",
  "type": "short_answer"
}
```

The user can still answer the question, but the app marks it as **Not automatically graded**.

## Difficulty

`difficulty` is optional and represents the question's current/persistent difficulty rating.

Allowed values:

```text
easy
medium
hard
```

If omitted, the question is treated as **unrated**. The app must not infer a difficulty value from the question content or answer history.

Historical attempts keep their recorded difficulty separately from the question's current difficulty.

## Backward Compatibility

Existing question banks without the newer fields remain valid where possible.

The importer should normalize older formats without destroying useful information. In particular:

* Missing question IDs are generated.
* Missing option IDs are generated.
* Existing option IDs are preserved.
* Existing answer formats may be normalized to option IDs for choice-based questions.
* Missing `subject`, `difficulty`, images, explanations, or answer keys do not invalidate otherwise usable questions.
* Questions must have either non-empty text or at least one valid question image.
* Choice options must have at least text or an image.

The app should not maintain a separate legacy and modern question system. Normalization should produce the canonical internal model.

## Complete Example

```json
{
  "title": "Physics — Kinematics",
  "description": "Practice questions with math and image-based options.",
  "subject": "Physics",
  "questions": [
    {
      "id": "q-001",
      "question": "A car accelerates from $5\\,\\mathrm{m/s}$ to $25\\,\\mathrm{m/s}$ in $4\\,\\mathrm{s}$. What is its acceleration?",
      "type": "numeric",
      "answer": 5,
      "explanation": "$a = \\frac{\\Delta v}{\\Delta t} = \\frac{25-5}{4} = 5\\,\\mathrm{m/s^2}$.",
      "difficulty": "medium"
    },
    {
      "id": "q-002",
      "questionImages": [
        {
          "src": "https://example.com/force-diagram.png",
          "alt": "Force diagram"
        }
      ],
      "type": "single_choice",
      "options": [
        {
          "id": "option-a",
          "image": {
            "src": "https://example.com/a.png",
            "alt": "Diagram A"
          }
        },
        {
          "id": "option-b",
          "image": {
            "src": "https://example.com/b.png",
            "alt": "Diagram B"
          }
        }
      ],
      "answer": "option-b"
    }
  ]
}
```


## AI Question Generator Prompt

<details>
<summary>Click to expand the reusable AI prompt</summary>

Copy the prompt below into an AI tool whenever you want to generate a question-bank JSON file for this app.

```text
You are generating a question bank for a modern question-practice web app.

## User Request

[PASTE YOUR QUESTION GENERATION REQUEST HERE]

## Task

Create a complete question bank based on the user's request.

Infer reasonable defaults when the request does not specify every detail. Generate original, accurate, useful questions appropriate to the requested subject, topic, level, language, difficulty, curriculum, question count, and question types.

Supported question types:
- single_choice
- multiple_choice
- true_false
- short_answer
- numeric

## Required JSON Schema

Generate one JSON object with this structure:

{
  "title": "Question Set Title",
  "description": "Short description",
  "subject": "Subject Name",
  "questions": []
}

Each question should follow this schema:

{
  "id": "q-001",
  "question": "Question text with optional LaTeX",
  "type": "single_choice",
  "options": [
    {
      "id": "option-a",
      "text": "Option text"
    },
    {
      "id": "option-b",
      "text": "Another option"
    }
  ],
  "answer": "option-a",
  "explanation": "Why this answer is correct.",
  "difficulty": "medium"
}

## Important Schema Rules

1. Every question must have a unique stable `id` such as `q-001`, `q-002`, etc.
2. Every choice option must have a unique stable `id` within its question, such as `option-a`, `option-b`, etc.
3. For `single_choice`, `answer` must be the ID of the correct option.
4. For `multiple_choice`, `answer` must be an array of the correct option IDs.
5. For `true_false`, use boolean `answer` values (`true` or `false`). You may include True/False options with stable IDs when appropriate.
6. For `short_answer`, `answer` should contain the expected text answer.
7. For `numeric`, `answer` should be a JSON number, not a formatted string.
8. `difficulty` may be `easy`, `medium`, or `hard`.
9. Do not invent difficulty when the user explicitly specifies a difficulty requirement.
10. `answer` and `explanation` are optional in the app, but include them by default unless the user explicitly asks not to.
11. Choice options may contain `text`, `image`, or both. Image-only options are valid.
12. Questions may contain text, images, or both. Image-only questions are valid.
13. For question images use `questionImage` for one image or `questionImages` for multiple images. Each image should use:
    {
      "src": "https://example.com/image.png",
      "alt": "Useful description of the image",
      "caption": "Optional caption"
    }
14. For option images use:
    {
      "src": "https://example.com/image.png",
      "alt": "Useful description of the image"
    }
15. Use direct/external image URLs only when an appropriate image is genuinely needed. Do not fabricate URLs that are supposed to point to real images.
16. If an image is required but no reliable external image URL is available, prefer generating a text-based question instead of inventing a URL.

## Math / LaTeX

Math may be written using LaTeX inside JSON strings.

Use inline math such as:
"Solve $x^2 - 5x + 6 = 0$."

For more complex expressions, use the app's supported LaTeX delimiters consistently. Escape backslashes correctly for JSON, for example `\\frac{a}{b}` inside a JSON string.

Do not replace mathematical notation with poorly formatted plain text when LaTeX would make it clearer.

## Question Quality

- Make every question unambiguous.
- Ensure every answer key is actually correct.
- For multiple-choice questions, make distractors plausible but clearly incorrect.
- Do not accidentally create multiple correct answers for a single-choice question.
- Avoid duplicate or near-duplicate questions unless repetition is explicitly requested.
- Match the requested educational level.
- Keep explanations concise but useful.
- Use the requested language.
- For numeric questions, make sure the expected answer follows directly from the stated information.
- Do not include unsupported claims or fabricated facts.

## Output Requirements

Do NOT paste the complete JSON into the chat response.

Instead:
1. Create a `.json` file containing the generated question bank.
2. Validate that the file is valid JSON before providing it.
3. Use a sensible filename based on the subject/topic, for example `physics-kinematics.json`.
4. Provide the user with a clickable download link to the generated `.json` file.
5. Briefly state what was generated (question count, subject/topic, and question types) without dumping the JSON into the chat.

The final JSON must be directly importable by the Study App described above.
```

</details>

---

# Running the App

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Notes

Question sets and study history are stored locally in the browser. Clearing the application's browser data may remove locally stored question sets and history.
