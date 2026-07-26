# MMM-NanoQuiz Roadmap

This roadmap identifies the major capabilities through which MMM-NanoQuiz will grow into the framework described in [`VISION.md`](VISION.md). It is intentionally concise. Detailed tasks belong in issues, commits, and milestone-specific documentation rather than here.

The ordering is directional rather than calendar-based. Each milestone must leave the project in an executable, tested, understandable, and verified state.

## 1. Project Foundation

Establish the purpose, development model, architectural boundaries, and repository conventions that guide all later work.

**Result:** A contributor can understand what the project is, why it exists, how architectural decisions are recorded, and what constitutes a complete increment.

## 2. Quiz Model and Validation

Define immutable quiz model objects and a validation pipeline that converts raw quiz definitions into normalized items and structured diagnostics.

**Result:** Quiz content can be validated independently of MagicMirror, rendering, files, or networks, with errors and warnings available as inspectable values.

**Current increment:** Immutable quiz and validation value objects are in place with behavior-oriented tests. The validator now supports question/answer and multiple-choice input, structured error diagnostics for invalid input, normalization of accepted string fields, and warnings for ignored optional text fields.

## 3. Quiz Source Abstraction

Separate quiz acquisition from validation through a common source contract, beginning with in-memory and local JSON sources.

**Result:** The framework can obtain quiz definitions from interchangeable sources without changing validation or presentation behavior.

**Current increment:** Establish the source contract with in-memory, local JSON, and remote JSON sources for raw quiz definitions.

## 4. Presentation Engine

Implement an event-oriented state machine that manages quiz sequencing, timing, answer revelation, and presentation progression without manipulating the DOM.

**Result:** Quiz behavior can execute and be tested independently of any renderer.

**Current increment:** Extend the `QuizEngine` slice with renderer-independent item sequencing, empty/ready/question/eliminating/answer phases, sequential or randomized advancement, avoid-immediate-repeat behavior, immutable presentation snapshots, one-answer reveal progression, prepared multiple-choice choice order, answer-safe elimination order, multiple-choice elimination state, phase timing metadata, and autonomous timer-driven progression. `start()`, `pause()`, `resume()`, and `skipToNext()` let the engine own transition timing itself, using injected `scheduleTimeout`/`clearTimeout` functions so the behavior stays host-independent and testable without real timers. MagicMirror now starts the engine once per load and re-renders from the snapshots it reports through `onChange`, retaining only DOM rendering as adapter-owned presentation behavior.

## 5. Presentation Strategies

Introduce strategy-based rendering for supported interaction forms, beginning with question-and-answer and multiple-choice presentations, as a bridge that keeps `MMM-NanoQuiz.js` free of per-item-type DOM conditionals.

**Result:** New presentation types can add their own rendering through a focused strategy without editing `MMM-NanoQuiz.js`'s `getDom()` or unrelated strategies.

**Current increment:** `PresentationStrategy` (`QuestionAnswerPresentation`, `MultipleChoicePresentation`) builds the one piece of DOM content that varies by item type; `presentationStrategyFor(item)` selects between them and is exposed through the adapter bridge as `NanoQuizAdapter.presentationStrategyFor`. `MMM-NanoQuiz.js`'s `getDom()` now delegates to `buildContentDom()` instead of branching on `currentItem.type` itself. This milestone is scoped to the adapter's rendering responsibility; `QuizEngine`'s own internal sequencing logic (timing lookup, elimination order, choice preparation) was intentionally left unchanged.

## 6. MagicMirror Adapter

Connect the framework to MagicMirror lifecycle, configuration, and DOM rendering while keeping adapter responsibilities isolated.

**Result:** MMM-NanoQuiz operates as a complete MagicMirror module whose core behavior remains framework-independent.

**Current integration:** The MagicMirror module delegates configured quiz loading and validation to the framework adapter bridge. The bridge selects `RemoteJsonSource` when `dataUrl` is configured and `LocalJsonSource` otherwise, warning when both `dataUrl` and `dataFile` are present. Before delegating, the module resolves its own configuration through `resolvedSourceConfig()`, which treats `dataFile` as unset when it still equals the compiled-in default and `dataUrl` is configured, so a config that specifies only `dataUrl` no longer triggers a spurious "both configured" warning caused by MagicMirror merging in the module's own default. The module also delegates presentation timing and sequencing to `QuizEngine`, driving it with `start()`/`pause()`/`resume()`/`skipToNext()` instead of scheduling timers itself, and delegates the per-item-type portion of DOM rendering to a `PresentationStrategy` selected through `presentationStrategyFor`. The MagicMirror module retains responsibility for host URL resolution, local browser requests, helper-mediated remote requests, lifecycle, logging, and the DOM chrome shared by every presentation type.

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
