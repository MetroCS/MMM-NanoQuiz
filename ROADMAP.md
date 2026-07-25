# MMM-NanoQuiz Roadmap

This roadmap identifies the major capabilities through which MMM-NanoQuiz will grow into the framework described in [`VISION.md`](VISION.md). It is intentionally concise. Detailed tasks belong in issues, commits, and milestone-specific documentation rather than here.

The ordering is directional rather than calendar-based. Each milestone must leave the project in an executable, tested, understandable, and verified state.

## 1. Project Foundation

Establish the purpose, development model, architectural boundaries, and repository conventions that guide all later work.

**Result:** A contributor can understand what the project is, why it exists, how architectural decisions are recorded, and what constitutes a complete increment.

## 2. Quiz Model and Validation

Define immutable quiz model objects and a validation pipeline that converts raw quiz definitions into normalized items and structured diagnostics.

**Result:** Quiz content can be validated independently of MagicMirror, rendering, files, or networks, with errors and warnings available as inspectable values.

**Current increment:** Immutable quiz and validation value objects are in place with behavior-oriented tests. A minimal question/answer validator now supports well-formed input, structured error diagnostics for invalid input, normalization of accepted string fields, and warnings for ignored optional text fields. Multiple-choice validation remains future work.

## 3. Quiz Source Abstraction

Separate quiz acquisition from validation through a common source contract, beginning with in-memory and local JSON sources.

**Result:** The framework can obtain quiz definitions from interchangeable sources without changing validation or presentation behavior.

## 4. Presentation Engine

Implement an event-oriented state machine that manages quiz sequencing, timing, answer revelation, and presentation progression without manipulating the DOM.

**Result:** Quiz behavior can execute and be tested independently of any renderer.

## 5. Presentation Strategies

Introduce strategy-based behavior for supported interaction forms, beginning with question-and-answer and multiple-choice presentations.

**Result:** New presentation types can be added through focused strategies rather than conditionals scattered across the engine.

## 6. MagicMirror Adapter

Connect the framework to MagicMirror lifecycle, configuration, and DOM rendering while keeping adapter responsibilities isolated.

**Result:** MMM-NanoQuiz operates as a complete MagicMirror module whose core behavior remains framework-independent.

## 7. Authoring and Preview Support

Provide validation feedback, examples, and a standalone preview path that help authors create and evaluate quiz collections before deployment.

**Result:** Quiz content can be authored and checked without requiring a running MagicMirror installation.

## 8. Extended Sources and Renderers

Add selected integrations, such as remote quiz sources or standalone browser rendering, where they demonstrate the value of the framework boundaries.

**Result:** At least one additional source or rendering environment reuses the existing core without architectural restructuring.

## 9. Stable Framework Release

Review the public model, configuration, extension points, documentation, and compatibility expectations for a stable release.

**Result:** The project offers a coherent supported surface, clear upgrade expectations, and a verified release suitable for broader reuse.

## Roadmap Maintenance

This document records major capability direction, not every possible feature. A proposed milestone or addition belongs here only when it materially advances the project vision and cannot be represented more clearly as work within an existing milestone.
