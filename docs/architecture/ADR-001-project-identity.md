# ADR-001: Project Identity

- **Status:** Accepted
- **Date:** 2026-07-25

## Context

MMM-NanoQuiz began as a MagicMirror module for presenting short educational quiz interactions. The expected evolution of the project includes additional quiz sources, presentation strategies, authoring tools, previews, and rendering environments.

If the domain behavior is designed around MagicMirror lifecycle methods, DOM construction, or local JSON files, future environments would require duplicating or restructuring core behavior. That would make testing more difficult and would couple educational behavior to one delivery technology.

## Decision

MMM-NanoQuiz will be designed as an educational quiz framework whose first rendering adapter is MagicMirror.

The framework's domain model, validation, loading contracts, sequencing, and presentation state will remain independent of MagicMirror. MagicMirror-specific code will adapt framework state and events to the MagicMirror lifecycle and DOM.

Dependencies will point toward the domain model. Core components will not depend on rendering frameworks, filesystems, network APIs, or MagicMirror globals.

## Alternatives Considered

### Treat MMM-NanoQuiz solely as a MagicMirror module

This would allow direct use of MagicMirror lifecycle methods throughout the implementation and could reduce initial code structure. It was rejected because it would make core behavior harder to test and reuse.

### Build separate implementations for each environment

This would permit each environment to use its native conventions. It was rejected because validation, sequencing, and presentation behavior would be duplicated and could diverge.

## Consequences

### Benefits

- Domain behavior can be tested without MagicMirror or a browser.
- New rendering environments can reuse the same behavior.
- Quiz sources and presentation strategies can evolve independently.
- MagicMirror integration remains comparatively small and focused.
- Architectural boundaries make responsibilities easier to understand.

### Costs

- The project requires explicit interfaces and adapters.
- Some behavior that could be written directly in a MagicMirror module must instead be expressed through framework contracts.
- Integration testing remains necessary in addition to framework unit tests.

## Related

- [`VISION.md`](../../VISION.md)
- ADR-002: Increment Development Model
