# MMM-NanoQuiz Architecture

This document provides a concise view of how MMM-NanoQuiz is organized. It describes the intended structure and dependency direction of the framework. Architectural rationale belongs in the Architecture Decision Records under [`docs/architecture`](architecture/).

## Architectural Summary

MMM-NanoQuiz is an educational quiz framework with adapters for specific rendering environments. MagicMirror is the first adapter, not the boundary of the framework.

The architecture separates five concerns:

1. representing quiz content
2. validating raw quiz definitions
3. obtaining quiz definitions from sources
4. managing quiz presentation behavior
5. rendering framework state in a host environment

Dependencies point toward the domain model.

```text
MagicMirror Adapter and Other Renderers
                 |
            Quiz Engine
                 |
            Quiz Sources
                 |
       Validation and Quiz Model
```

A component may depend on components below it in this view. Components below it must not depend on components above it.

## Core Components

### Quiz Model

The quiz model represents validated quiz content as immutable domain objects.

Primary responsibility:

- express quiz content and domain-level invariants

Representative object:

- `QuizItem`

Likely quiz item data includes:

- presentation type
- question
- answer
- choices
- category
- explanation

The model does not load files, access networks, manipulate the DOM, or depend on MagicMirror.

### Validation

Validation converts raw quiz definitions into normalized model objects and structured diagnostics.

Primary responsibilities:

- identify invalid or questionable content
- normalize accepted content
- produce inspectable validation results

Representative objects:

- `QuizValidator`
- `ValidationResult`
- `Diagnostic`

Diagnostics are values rather than console messages or thrown strings. They may include severity, code, source, item index, field, and message.

Errors prevent successful validation. Warnings preserve accepted content while communicating potential concerns.

### Quiz Sources

Quiz sources obtain raw quiz definitions without deciding whether those definitions are valid or how they will be presented.

Primary responsibility:

- acquire raw quiz data from a specific origin

Source contract:

- `QuizSource`

The source contract is intentionally small:

- `id`: identifies the origin for diagnostics, logs, and adapter messages
- `loadRawItems()`: asynchronously returns raw quiz definitions

Sources return raw data, not `QuizItem` instances. They do not validate, normalize, sequence, randomize, or render quiz content. Validation remains the responsibility of `QuizValidator`, which receives raw definitions from a source and decides what can become domain model objects.

Initial implementations may include:

- `MemorySource`
- `LocalJsonSource`
- `RemoteJsonSource`

A source returns data to the validation pipeline. It does not construct presentation state or render output.

The first source abstraction increment establishes an asynchronous source contract and a `MemorySource` for already-available raw quiz definitions. `MemorySource` is useful for tests, previews, and adapter seams because it exercises the source contract without introducing filesystem or network behavior.

`MemorySource` defensively copies raw definitions when constructed and when loaded. This protects caller-owned data and prevents consumers from mutating the source's stored raw definitions between loads. It still preserves invalid or unnormalized content exactly as source data so that validation behavior remains observable in the validation layer.

The second source abstraction increment introduces `LocalJsonSource`. It reads JSON text from a supplied reader function, parses it, and returns raw definitions. The reader function owns environment-specific file access, keeping filesystem APIs outside the core source contract and making source behavior testable without touching the filesystem.

The third source abstraction increment introduces `RemoteJsonSource`. It requests JSON text from a supplied requester function, parses it, and returns raw definitions. The requester owns environment-specific network behavior, keeping browser or Node network APIs outside the core source contract and making remote source behavior testable without live network access.

The MagicMirror adapter boundary uses the source abstraction for configured quiz loading. When `dataUrl` is present, the adapter bridge creates a `RemoteJsonSource`; otherwise it resolves `dataFile` through the MagicMirror module and creates a `LocalJsonSource`. If both `dataUrl` and `dataFile` are configured, `dataUrl` takes precedence and the adapter emits a warning. Both sources receive a MagicMirror-provided text requester, keeping browser `fetch`, helper-mediated remote requests, and MagicMirror path resolution outside the reusable source implementations.

### Quiz Engine

The quiz engine manages the progression of a quiz presentation.

Primary responsibilities may include:

- selecting and sequencing quiz items
- managing presentation state
- coordinating answer revelation
- advancing through presentation phases
- emitting domain events

Representative object:

- `QuizEngine`

The engine is event-oriented and does not manipulate the DOM. Renderers observe engine state or events and translate them into host-specific output.

The first presentation engine increments introduce `QuizEngine` as a renderer-independent owner of quiz item sequencing and answer reveal progression. It accepts validated quiz items, advances to the next item, supports sequential or randomized question order, can avoid immediate repeats when randomizing, prepares multiple-choice choice order, derives answer-safe elimination order, transitions one-answer items from question to answer, coordinates multiple-choice elimination, and exposes immutable snapshots containing the current phase, item index, prepared item, eliminated choice indexes, item count, and next transition delay.

The current engine increment adds autonomous timing: `start({ onChange, scheduleTimeout, clearTimeout })` selects the first item, notifies `onChange` with each snapshot, and arms a transition using injected `scheduleTimeout`/`clearTimeout` functions so the engine drives itself through question, elimination, and answer phases and on to the next item without a caller invoking each transition manually. `pause()` cancels the pending transition without losing engine state, `resume()` re-arms a transition for the current phase, and `skipToNext()` cancels any pending transition and advances immediately, supporting a host's "show the next item now" control. The manual transition methods (`advanceToNextItem`, `revealAnswer`, `startMultipleChoiceElimination`, `eliminateNextChoice`) remain available and side-effect-free for direct use in tests or callers that do not want autonomous progression. Injecting the scheduling functions keeps `QuizEngine` free of a hard dependency on any specific timer implementation and lets tests observe and trigger transitions deterministically instead of waiting on real time.

MagicMirror integration creates a `QuizEngine` after configured quiz items are loaded and calls `start()` with an `onChange` callback that copies each snapshot into local module state and re-renders. The adapter no longer owns timers, phase-transition logic, or elimination sequencing: `suspend()`/`resume()` call `engine.pause()`/`engine.resume()`, and the `NANOQUIZ_NEXT` notification calls `engine.skipToNext()`. Reloading configured quiz content pauses the previous engine before creating and starting a replacement so only one engine drives the module's rendered state at a time.

### Adapters and Renderers

Adapters connect the framework to a host environment.

The MagicMirror adapter is responsible for:

- translating MagicMirror configuration into framework configuration
- connecting MagicMirror lifecycle events to framework behavior
- rendering framework state as DOM
- applying MagicMirror-specific styling and integration

The adapter must not own quiz validation, sequencing rules, or presentation strategy behavior.

The adapter delegates configured quiz loading and raw quiz validation through the framework adapter bridge, then translates diagnostics into host logging. Because MagicMirror merges module defaults into `this.config` before the module runs, the adapter first resolves its own configuration through `resolvedSourceConfig()`, which treats `dataFile` as unset when it still equals the compiled-in default and `dataUrl` is configured. This keeps the ambiguity of MagicMirror's config merging out of the framework-level source selection in `loadNanoQuizItems`, which continues to warn correctly whenever both `dataUrl` and a genuinely configured `dataFile` are present. It delegates presentation timing and sequencing to `QuizEngine`, driving it with `start()`, `pause()`, `resume()`, and `skipToNext()` and re-rendering from the snapshots the engine reports through `onChange`. The adapter still owns MagicMirror path resolution, text requests, lifecycle behavior, and DOM rendering. Local module files are requested by the browser. Remote URLs are requested through `node_helper.js` so browser CORS policy does not prevent MagicMirror from loading quiz content from servers that do not explicitly allow `localhost`. Because MagicMirror loads the module entrypoint through its classic browser runtime, a small `.mjs` bridge imports adapter-facing source modules and exposes narrow entrypoints to the MagicMirror module.

Additional adapters may support standalone browser previews, authoring tools, or other display environments.

### Presentation Strategies

Presentation strategies are a rendering-helper bridge inside the MagicMirror adapter, not an independent framework layer. They exist to keep `MMM-NanoQuiz.js` free of per-item-type DOM conditionals: `getDom()` builds the chrome shared by every presentation type (status states, category, question, explanation, progress) directly, and delegates the one piece of markup that varies by item type to a `PresentationStrategy`.

Primary responsibility:

- build the DOM content for the current phase and item, for one presentation type

Strategy contract:

- `PresentationStrategy.buildContent(document, { phase, item, eliminatedChoiceIndexes })`

Implementations:

- `QuestionAnswerPresentation`: renders the answer, hidden behind an accessible placeholder until the answer phase.
- `MultipleChoicePresentation`: renders one element per choice, marking eliminated choices and the correct choice once the answer phase is reached.

`presentationStrategyFor(item)` selects the right strategy by `item.type` (`multipleChoice`, otherwise question/answer) and is exposed through the adapter bridge as `NanoQuizAdapter.presentationStrategyFor`, alongside `createQuizEngine`, `loadNanoQuizItems`, and `validateNanoQuizItems`. `MMM-NanoQuiz.js`'s `buildContentDom()` looks up the strategy for `this.currentItem` and calls `buildContent(document, ...)`, so `getDom()` itself never branches on item type.

Because this layer exists to keep host-specific rendering code out of `MMM-NanoQuiz.js`, strategies are expected to use DOM APIs (`document.createElement`, `classList`, `textContent`) directly — unlike the framework-core layers below, which must not depend on the DOM. Strategy tests use a minimal in-test fake `document` (an object exposing just `createElement`) so they run under Node without a browser.

### Authoring Tools

Authoring tools let quiz authors check content without a running MagicMirror installation. They reuse `QuizValidator` directly rather than duplicating validation policy.

Primary responsibility:

- report validation diagnostics for a quiz file outside any host environment

Representative objects:

- `validateQuizFile(filePath, { readTextFile, validator })`: reads and parses a quiz JSON file and returns a `ValidationResult`. File reading is injected (defaulting to `node:fs/promises`) so the function is testable without touching the filesystem.
- `runValidateQuizCli(argv, { validate, writeLine, writeErrorLine })`: the testable CLI core. It reports a usage message and a non-zero exit code when no file path is given, reports the error message and a non-zero exit code when validation fails outright (unreadable file, invalid JSON), otherwise prints one formatted diagnostic per issue and a summary line, exiting `0` only when the result is valid.
- `bin/validate-quiz.js`: a thin executable that wires `runValidateQuizCli` to real `process.argv`, `console`, and `process.exitCode`. Its location under `bin/` follows Node's own `package.json` `bin`-field convention rather than a project-specific scheme; see [ADR-004](architecture/ADR-004-host-entry-points.md) for why entry point placement follows each host's own convention.

`formatDiagnostic` (in `src/validation/formatDiagnostic.js`) is a shared, dependency-free formatting function used by both the CLI and the MagicMirror adapter's `validateNanoQuizItems`, so a diagnostic reads identically whether it surfaced from a running module or from the CLI validator.

Authoring tools depend on the validation layer only. They do not depend on the engine, adapters, or presentation strategies.

## Data Flow

The normal flow is:

```text
QuizSource
    |
raw quiz definitions
    v
QuizValidator
    |
ValidationResult
    |
validated QuizItems
    v
QuizEngine
    |
presentation state and events
    v
Adapter or Renderer
    |
selects a Presentation Strategy by item type
    v
renderable state
```

Invalid source data does not proceed into normal engine operation. Validation diagnostics remain available to adapters, authoring tools, logs, and tests.

## Dependency Rules

The following rules define the architectural boundary:

- Domain model objects depend on no framework or infrastructure layer.
- Validation may depend on the domain model.
- Quiz sources may provide raw data to validation but do not control validation policy.
- The engine may depend on validated model objects; it does not depend on presentation strategies or any adapter.
- Presentation strategies belong to an adapter. They may depend on the phase, item, and eliminated-choice state the adapter provides, and on that adapter's host rendering APIs, but must not perform quiz validation, sourcing, or sequencing.
- Adapters may depend on all required framework layers, and select and invoke their own presentation strategies.
- Core framework layers (model, validation, sources, engine) must not depend on MagicMirror globals, browser DOM APIs, filesystem APIs, or network APIs.

Infrastructure-specific behavior must be placed behind an adapter or source abstraction.

## Extension Points

The architecture intentionally supports extension in three primary areas.

### New Quiz Sources

Implement the `QuizSource` contract to obtain raw quiz definitions from another origin.

### New Presentation Strategies

Implement the `PresentationStrategy` contract within an adapter to add DOM rendering for another interaction form, and register it with that adapter's strategy lookup (for example, `presentationStrategyFor` in the MagicMirror adapter), without changing unrelated strategies.

### New Authoring Tools

Build additional tooling (for example, batch validation of multiple files, or a standalone preview) on top of `QuizValidator` and the existing CLI functions without introducing a MagicMirror or browser dependency.

### New Rendering Environments

Create an adapter that observes framework state and events and translates them into the host environment.

Extensions must preserve the dependency direction described above.

## Testing Boundaries

Tests focus on externally observable behavior.

- Model tests verify invariants and immutability.
- Validator tests verify normalized output and diagnostics.
- Source tests verify acquisition behavior and source-specific failures.
- Engine tests verify state transitions and emitted events.
- Strategy tests verify interaction-specific DOM content, using a minimal fake `document` so they run without a browser.
- Adapter tests verify translation between the host environment and framework behavior.
- Authoring tool tests verify CLI behavior (usage, error handling, diagnostic output, exit codes) with injected file reading and output functions, without spawning a real process or touching the filesystem.

Tests should not require MagicMirror or a browser unless the behavior under test belongs specifically to the MagicMirror adapter or DOM renderer.

## Current Status

The architecture describes the intended framework as it is being developed incrementally. Not every named component is necessarily implemented yet.

Completed framework foundations include immutable quiz model values, structured validation, in-memory/local/remote JSON source abstractions, and MagicMirror adapter integration for configured source loading.

The presentation engine milestone described in [`ROADMAP.md`](../ROADMAP.md) is complete. The engine establishes renderer-independent item sequencing, immutable presentation snapshots, one-answer reveal progression, prepared multiple-choice choice order, answer-safe elimination order, multiple-choice elimination state, phase timing metadata, and autonomous timer-driven progression through `start()`, `pause()`, `resume()`, and `skipToNext()`. MagicMirror integration starts the engine and rerenders from the snapshots it reports; the adapter no longer schedules timers or drives phase transitions itself.

The presentation strategies milestone is complete. `PresentationStrategy` (`QuestionAnswerPresentation`, `MultipleChoicePresentation`) factors the one piece of per-item-type DOM content out of `MMM-NanoQuiz.js`, selected through `presentationStrategyFor` on the adapter bridge. `getDom()` itself no longer branches on item type; note that `QuizEngine.js` still does, internally, for sequencing-level concerns (timing lookup, elimination order, choice preparation) — that internal engine branching was intentionally left as is, since Presentation Strategies were scoped specifically to the adapter's rendering responsibility, not to the engine's internal sequencing logic.

The current development focus is the authoring and preview support milestone, scoped to a CLI validator. `validateQuizFile` and `runValidateQuizCli` reuse `QuizValidator` and the shared `formatDiagnostic` to check a quiz JSON file and report diagnostics with the same wording the running module would log, without requiring MagicMirror or a browser. `bin/validate-quiz.js` is the executable entry point, runnable via `npm run validate -- <path>` or the `nanoquiz-validate` bin. End-user-facing usage and diagnostic documentation lives in [`docs/Quiz-Authoring-Guide.md`](Quiz-Authoring-Guide.md), not here, since that audience is quiz content authors rather than contributors to this architecture document.

## Related Documents

- [`VISION.md`](../VISION.md): project purpose and guiding principles
- [`ROADMAP.md`](../ROADMAP.md): major capability milestones
- [`ADR-001: Project Identity`](architecture/ADR-001-project-identity.md)
- [`ADR-002: Increment Development Model`](architecture/ADR-002-increment-development-model.md)
- [`ADR-003: MagicMirror ESM Bridge`](architecture/ADR-003-magicmirror-esm-bridge.md)
- [`ADR-004: Host Entry Points Stay Thin and Host-Conventional`](architecture/ADR-004-host-entry-points.md)
