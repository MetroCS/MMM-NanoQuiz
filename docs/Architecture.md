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
        Presentation Strategies
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

Initial implementations may include:

- `MemorySource`
- `LocalJsonSource`
- `RemoteJsonSource`

A source returns data to the validation pipeline. It does not construct presentation state or render output.

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

### Presentation Strategies

Presentation strategies encapsulate behavior that varies by interaction type.

Primary responsibility:

- define how a particular presentation type progresses and what state it exposes

Strategy contract:

- `PresentationStrategy`

Initial implementations may include:

- `QuestionAnswerPresentation`
- `MultipleChoicePresentation`

Strategies prevent question-type conditionals from spreading through the engine and renderers.

### Adapters and Renderers

Adapters connect the framework to a host environment.

The MagicMirror adapter is responsible for:

- translating MagicMirror configuration into framework configuration
- connecting MagicMirror lifecycle events to framework behavior
- rendering framework state as DOM
- applying MagicMirror-specific styling and integration

The adapter must not own quiz validation, sequencing rules, or presentation strategy behavior.

Additional adapters may support standalone browser previews, authoring tools, or other display environments.

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
Presentation Strategy
    |
renderable state
    v
Adapter or Renderer
```

Invalid source data does not proceed into normal engine operation. Validation diagnostics remain available to adapters, authoring tools, logs, and tests.

## Dependency Rules

The following rules define the architectural boundary:

- Domain model objects depend on no framework or infrastructure layer.
- Validation may depend on the domain model.
- Quiz sources may provide raw data to validation but do not control validation policy.
- The engine may depend on validated model objects and presentation contracts.
- Presentation strategies may depend on domain concepts and engine contracts, but not on host rendering APIs.
- Adapters may depend on all required framework layers.
- Core framework layers must not depend on MagicMirror globals, browser DOM APIs, filesystem APIs, or network APIs.

Infrastructure-specific behavior must be placed behind an adapter or source abstraction.

## Extension Points

The architecture intentionally supports extension in three primary areas.

### New Quiz Sources

Implement the `QuizSource` contract to obtain raw quiz definitions from another origin.

### New Presentation Strategies

Implement the `PresentationStrategy` contract to add another interaction form without changing unrelated strategies.

### New Rendering Environments

Create an adapter that observes framework state and events and translates them into the host environment.

Extensions must preserve the dependency direction described above.

## Testing Boundaries

Tests focus on externally observable behavior.

- Model tests verify invariants and immutability.
- Validator tests verify normalized output and diagnostics.
- Source tests verify acquisition behavior and source-specific failures.
- Engine tests verify state transitions and emitted events.
- Strategy tests verify interaction-specific progression.
- Adapter tests verify translation between the host environment and framework behavior.

Tests should not require MagicMirror or a browser unless the behavior under test belongs specifically to the MagicMirror adapter or DOM renderer.

## Current Status

The architecture describes the intended framework as it is being developed incrementally. Not every named component is necessarily implemented yet.

The current development focus is the quiz model and validation milestone described in [`ROADMAP.md`](../ROADMAP.md).

The first increment of this milestone establishes immutable value objects and behavior-oriented tests for:

- `QuizItem`
- `Diagnostic`
- `ValidationResult`

The second increment introduces a minimal `QuizValidator` happy path for already well-formed question/answer definitions.

The third increment adds structured error diagnostics for invalid top-level input, invalid item shapes, and missing question/answer fields.

The fourth increment normalizes accepted string fields by trimming surrounding whitespace before creating `QuizItem` objects. Warnings and multiple-choice validation remain planned work for later increments in this milestone.

## Related Documents

- [`VISION.md`](../VISION.md): project purpose and guiding principles
- [`ROADMAP.md`](../ROADMAP.md): major capability milestones
- [`ADR-001: Project Identity`](architecture/ADR-001-project-identity.md)
- [`ADR-002: Increment Development Model`](architecture/ADR-002-increment-development-model.md)
