# Global Project Instructions

You are building a production-quality modern study application.

These instructions apply to the ENTIRE project and all future implementation segments.

## 1. Technology Stack

Do NOT build this as a basic HTML/CSS/JavaScript website.

Use:

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui for reusable UI components
* Lucide React for icons

Use modern React patterns and functional components.

Use TypeScript strictly. Avoid `any` unless there is a genuinely unavoidable reason.

Use a proper component-based architecture instead of putting everything into one file.

## 2. Architecture

Keep the project modular and maintainable.

Organize code into logical areas such as:

```text
src/
├── components/
├── features/
├── pages/
├── hooks/
├── lib/
├── types/
├── utils/
└── data/
```

The exact structure may be adjusted when necessary, but avoid creating a giant `App.tsx`.

Separate:

* UI components
* Business logic
* Data models
* Storage
* Validation
* Question handling
* Session logic

Features added in later segments should integrate with the existing architecture instead of rewriting previous work.

## 3. State Management

Don't scatter important application state across random components.

Use an appropriate state-management approach.

For simple local state, React state/hooks are fine.

For shared application state, use a proper centralized solution such as Zustand if necessary.

Keep persistent data separate from temporary UI state.

## 4. Persistence

The application is initially client-side.

Use IndexedDB for substantial persistent application data rather than relying entirely on localStorage.

localStorage can be used for small preferences/settings where appropriate.

Design the persistence layer behind an abstraction so a backend/database can be added later without rewriting the application.

For example:

```text
QuestionRepository
SessionRepository
SettingsRepository
```

The UI should not directly manipulate IndexedDB everywhere.

## 5. UI Design

The application should look like a polished modern study platform.

Do NOT make it look like:

* A basic school website
* A default Bootstrap site
* A plain HTML form
* An admin dashboard template
* A generic AI-generated landing page

Aim for:

* Clean
* Modern
* Focused
* Dense enough for studying
* Excellent typography
* Good spacing
* Subtle borders
* Clear hierarchy
* Smooth interactions
* Strong usability

Use shadcn/ui components where appropriate rather than reinventing common components.

Use Lucide icons instead of manually-created SVG icons whenever possible.

## 6. Responsive Design

The application must work properly on:

* Desktop
* Laptop
* Tablet
* Mobile

Don't simply shrink the desktop UI.

Important study interfaces should adapt their layout intelligently.

## 7. Themes

Support:

* Dark mode
* Light mode

Use the application's design system consistently.

Avoid hardcoding colors throughout individual components.

Use semantic theme variables/tokens instead.

## 8. Accessibility

Build accessible interfaces from the beginning.

Use:

* Proper semantic elements
* Keyboard navigation
* Visible focus states
* Accessible labels
* Appropriate ARIA attributes where necessary
* Good color contrast

Don't sacrifice accessibility for visual appearance.

## 9. Error Handling

Never silently fail.

Handle:

* Invalid JSON
* Corrupted data
* Missing fields
* Missing question IDs
* Unsupported question types
* Storage failures
* Missing images
* Invalid configuration

Errors should be understandable to a normal user.

Avoid exposing raw stack traces in the UI.

## 10. Data Integrity

User data is important.

Never silently overwrite:

* Imported questions
* User answers
* Previous attempts
* Session history

Keep imported question data separate from session/attempt data.

For example:

```text
Question
    ↓
Question Set

Session
    ↓
Question Attempt
    ↓
User Answer
```

A user's answer should never replace the original correct answer.

## 11. Extensibility

The application will be developed incrementally.

Future features will be added through separate implementation segments.

Therefore:

* Don't over-engineer features that don't exist yet.
* Don't implement future features prematurely.
* But design current interfaces so future features can be added cleanly.

For example, question types should use an extensible architecture rather than a giant chain of:

```ts
if (type === ...)
else if (type === ...)
else if (type === ...)
```

when a registry/component strategy would be cleaner.

## 12. No Fake Functionality

Do not create UI controls that don't actually work.

If a feature has not been implemented yet, don't create a fake button pretending it works.

Every implemented feature should actually function.

Avoid placeholder data unless explicitly required for development.

## 13. No Unnecessary Dependencies

Prefer the existing stack and dependencies.

Before installing a package, consider whether the functionality can reasonably be implemented using the existing stack.

Don't install huge libraries for tiny features.

## 14. Code Quality

Write readable code.

Prefer:

* Small focused components
* Clear names
* Reusable utilities
* Strong TypeScript types
* Predictable data flow

Avoid:

* Giant components
* Duplicated logic
* Magic constants everywhere
* Excessive comments explaining obvious code
* Dead code
* Unused imports
* Temporary hacks left behind

## 15. Testing

After implementing each development segment:

1. Run the type checker.
2. Run linting if configured.
3. Run the production build.
4. Fix errors before finishing the segment.

Test the functionality that was actually implemented.

Don't claim something works without verifying it.

## 16. Development Workflow

I will provide the application requirements in multiple segments.

Each segment adds functionality to the existing project.

For every segment:

1. Inspect the current project.
2. Understand what has already been implemented.
3. Implement ONLY the features requested in the current segment.
4. Integrate them with existing functionality.
5. Avoid unnecessarily rewriting working code.
6. Run validation/build checks.
7. Fix any issues introduced by the changes.

Do not implement future segments early.

## 17. Visual Quality

Before considering a UI feature complete, make sure it feels intentional.

Pay attention to:

* Spacing
* Typography
* Component sizing
* Empty states
* Loading states
* Error states
* Hover states
* Focus states
* Mobile behavior
* Consistent icon usage

The goal is a real application that feels pleasant to use for long study sessions.

## 18. Important Product Principle

This is a study tool, not a generic CRUD dashboard.

The most important experience is:

```text
Import
   ↓
Choose what to practice
   ↓
Configure session
   ↓
Answer questions
   ↓
Review performance
   ↓
Learn from mistakes
```

The interface should keep that workflow clear and minimize unnecessary friction.

## 19. Don't Ask for Permission for Normal Implementation Decisions

When requirements are sufficiently clear, make reasonable engineering decisions yourself.

Don't stop to ask me whether you should:

* Create a component
* Add a utility
* Refactor a small piece
* Choose between equivalent implementation approaches
* Fix an obvious bug

Only ask when a decision would materially change the product requirements or when required information is genuinely missing.

## 20. Incremental Development Rule

Treat every segment as a real milestone.

After completing a segment, leave the project in a stable, runnable state.

Do not leave half-implemented functionality because it belongs to a later segment.

Future segments will build on the current implementation.
