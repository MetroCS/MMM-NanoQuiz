# ADR-004: Host Entry Points Stay Thin and Host-Conventional

- **Status:** Accepted
- **Date:** 2026-07-27

## Context

MMM-NanoQuiz now has two host environments that load framework code: MagicMirror (`MMM-NanoQuiz.js`, via the ADR-003 `.mjs` bridge) and, starting with the Milestone 7 CLI validator, a Node CLI (`bin/validate-quiz.js`). Both entry points call into the same canonical `src/` implementation rather than reimplementing behavior.

The CLI entry point raised a question not previously settled explicitly: where should a new host's entry point file live, and by what name? Nothing in ADR-001 through ADR-003 states this generally; ADR-003 only established the pattern for the MagicMirror host specifically (a small bridge module, loaded through `getScripts()`, exposing a narrow global).

Node's package ecosystem has its own strong, pre-existing convention for this: an executable referenced from `package.json`'s `bin` field is conventionally placed under a `bin/` directory, named after the command it exposes. Node did not need this project to invent a placement rule; it already has one.

## Decision

A host's entry point file is placed and named according to that host's own platform convention, not a convention invented by this project. The entry point stays as thin as that convention allows: it wires the host's I/O primitives (`process.argv`, `console`, `process.exitCode`; or MagicMirror's `Module.register`, `getScripts()`) to canonical `src/` functions, and contains no framework logic of its own.

Applied so far:

- MagicMirror host: `MMM-NanoQuiz.js` (classic script, per `Module.register`) plus `src/adapter/MagicMirrorAdapter.mjs` (ESM bridge), per ADR-003.
- Node CLI host: `bin/validate-quiz.js`, per npm's `bin` field convention, delegating to `src/cli/runValidateQuizCli.js`.

The corollary: nothing about the *directory name* (`bin/`) or *file name* (`validate-quiz.js`) is architecturally significant on its own, and future contributors should not read project meaning into it. What is architecturally significant, and does apply project-wide, is the shape behind it:

- The entry point file itself performs no validation, sequencing, or presentation logic.
- All real behavior is a plain, dependency-injectable function in `src/` (`runValidateQuizCli(argv, { validate, writeLine, writeErrorLine })`), testable without invoking the entry point, spawning a process, or touching real I/O.
- The entry point's only job is supplying the real I/O implementations the injected parameters default away from in tests.

## Alternatives Considered

### Put a project-wide rule in Architecture.md instead of an ADR

Architecture.md documents the current, living structure of the framework and its dependency rules; it is not the record of *why* a boundary was drawn where it was, or what was considered and rejected. Placement conventions that could reasonably be questioned later (why `bin/`? why not `cli/` or `tools/`?) belong in an ADR so the reasoning survives, per the same rationale ADR-002 gives for keeping decision records separate from architecture description.

### Invent a project-specific entry-point convention (e.g. `entrypoints/cli/validate-quiz.js`)

This would make entry-point placement uniform across hosts regardless of platform, but it fights each host's own tooling for no benefit: it would make the CLI entry point invisible to npm's `bin` resolution without extra `package.json` path plumbing, and it would not match how any other Node CLI tool is packaged, adding friction for contributors already familiar with Node conventions.

### Leave the placement undocumented as an implementation detail

This was the state immediately after Milestone 7's implementation. It under-documents a decision the user identified as worth recording deliberately, and leaves future contributors to guess whether `bin/` was a considered choice or an accident.

## Consequences

### Benefits

- Each host's entry point is discoverable the way that host's own ecosystem expects (`npm` finds `bin/validate-quiz.js` through `package.json`; MagicMirror finds `MMM-NanoQuiz.js` through `Module.register`).
- The project does not maintain a bespoke placement scheme that every new host would otherwise need to justify from scratch.
- The thin-entry-point requirement (I/O wiring only, real logic injectable and in `src/`) is now stated once, generally, instead of being re-derived per host.

### Costs

- Entry point locations are not visually uniform across hosts (`MMM-NanoQuiz.js` at the repository root, `bin/validate-quiz.js` under `bin/`); a contributor must know each host's convention rather than one project rule.
- Future hosts may introduce yet another placement convention, so this ADR's "follow the host" rule must be re-applied by judgment each time, rather than mechanically.

## Related

- [ADR-002: Increment Development Model](ADR-002-increment-development-model.md)
- [ADR-003: MagicMirror ESM Bridge](ADR-003-magicmirror-esm-bridge.md)
- [`docs/Architecture.md`](../Architecture.md)
- [`ROADMAP.md`](../../ROADMAP.md) — Milestone 7
