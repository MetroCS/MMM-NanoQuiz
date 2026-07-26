# ADR-003: MagicMirror ESM Bridge

- **Status:** Accepted
- **Date:** 2026-07-25

## Context

MMM-NanoQuiz keeps framework behavior in source modules under `src/`. The MagicMirror module entrypoint, `MMM-NanoQuiz.js`, is loaded by MagicMirror as a classic browser script. During adapter integration, direct dynamic `import()` from the classic entrypoint failed in the MagicMirror runtime.

The project needs MagicMirror integration to reuse canonical framework code without duplicating implementation into generated or hand-maintained browser bundles.

## Decision

MagicMirror-specific integration with framework ESM code will use small `.mjs` bridge modules loaded through `getScripts()`.

The MagicMirror entrypoint remains a classic script compatible with `Module.register`. A bridge module imports the canonical source implementation and exposes a narrow browser global for the MagicMirror entrypoint to call.

For validation and configured source loading, `src/adapter/MagicMirrorAdapter.mjs` imports adapter-facing source modules such as `validateNanoQuizItems` and `loadNanoQuizItems`, then exposes them through `globalThis.NanoQuizAdapter`.

The source implementation remains canonical. Bridge modules are adapters, not alternate implementations.

## Alternatives Considered

### Dynamic import from `MMM-NanoQuiz.js`

This keeps all integration wiring inside the main module file, but it failed in the MagicMirror runtime because the entrypoint is loaded as a classic browser script.

### Generated browser bundle

A generated or hand-maintained browser bundle can be loaded as a classic script, but it introduces another artifact to keep synchronized with `src/`. A hand-maintained bundle is especially risky because validation behavior could diverge from the tested source implementation.

### Move framework code into the MagicMirror entrypoint

This would simplify browser loading but would reverse the project boundary by putting framework behavior back into MagicMirror-specific code.

## Consequences

### Benefits

- MagicMirror can load framework-backed behavior through its normal dependency mechanism.
- Framework implementation remains canonical in `src/`.
- The MagicMirror entrypoint remains compatible with classic `Module.register` loading.
- Bridge modules are small and reusable for future adapter-facing framework capabilities.
- No generated validation artifact is required.

### Costs

- Each framework capability exposed to MagicMirror may need a small bridge module.
- Runtime smoke tests remain important because the bridge depends on MagicMirror script loading behavior.
- Browser globals introduced by bridges must remain narrow and intentionally named.

## Related

- [ADR-001: Project Identity](ADR-001-project-identity.md)
- [ADR-002: Increment Development Model](ADR-002-increment-development-model.md)
- [`docs/Architecture.md`](../Architecture.md)
