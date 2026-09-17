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

A question set uses this structure:

```json
{
  "title": "Math Test",
  "description": "Example question set",
  "questions": [
    {
      "id": "q1",
      "question": "What is 2 + 2?",
      "type": "single_choice",
      "options": [
        "3",
        "4",
        "5"
      ],
      "answer": "4",
      "explanation": "2 + 2 = 4."
    }
  ]
}
```

## Question Fields

| Field         | Required | Description                                                           |
| ------------- | -------- | --------------------------------------------------------------------- |
| `id`          | No       | Unique question ID. Generated automatically if omitted.               |
| `question`    | Yes      | The question text.                                                    |
| `type`        | Yes      | Question type.                                                        |
| `options`     | Depends  | Answer choices for choice-based questions.                            |
| `answer`      | No       | Correct answer. If omitted, the question is not automatically graded. |
| `explanation` | No       | Explanation shown during review.                                      |
| `subject`     | No       | Subject name, such as `Mathematics`.                                  |
| `topic`       | No       | Topic name, such as `Algebra`.                                        |
| `images`      | No       | Images associated with the question.                                  |

## Question Type Examples

### Single Choice

```json
{
  "question": "What is 5 × 6?",
  "type": "single_choice",
  "options": ["20", "25", "30", "35"],
  "answer": "30"
}
```

### Multiple Choice

`answer` should be an array containing all correct options.

```json
{
  "question": "Which numbers are even?",
  "type": "multiple_choice",
  "options": ["2", "3", "4", "7"],
  "answer": ["2", "4"]
}
```

### True / False

```json
{
  "question": "10 is greater than 5.",
  "type": "true_false",
  "options": ["True", "False"],
  "answer": true
}
```

### Short Answer

```json
{
  "question": "Simplify: 2x + 3x",
  "type": "short_answer",
  "answer": "5x"
}
```

### Numeric

```json
{
  "question": "What is 12 × 7?",
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

The user can still answer the question, but the app will mark it as **Not automatically graded**.

## Images

A question can contain one or more images.

```json
{
  "question": "What is shown in the diagram?",
  "type": "single_choice",
  "options": ["A", "B", "C", "D"],
  "answer": "B",
  "images": [
    {
      "src": "https://example.com/diagram.png",
      "alt": "Diagram showing the circuit",
      "caption": "Circuit diagram"
    }
  ]
}
```

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
