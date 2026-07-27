# ADR-005: Semantic Versioning and Compatibility Policy

- **Status:** Accepted
- **Date:** 2026-07-27

## Context

By the end of Milestone 7, the project has a coherent, tested surface: an immutable quiz model and validator, a quiz source contract, a renderer-independent presentation engine, presentation strategies, a complete MagicMirror adapter, and CLI authoring tools. Milestone 9 ("Stable Framework Release") calls for reviewing "compatibility expectations" so the project is "suitable for broader reuse."

Nothing in the project currently says what a version number means. Today, a commit that removes a config option and a commit that fixes a typo in a log message are both just commits; `package.json`'s version has stayed at `0.1.0` regardless of what changed underneath it. A consumer deciding whether to upgrade — someone's `config.js`, a fork building another adapter, or a contributor extending a `QuizSource` — has no way to tell from the version number alone whether an upgrade is safe.

## Decision

The project adopts [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`) starting with this release, `1.0.0`, and records changes in `CHANGELOG.md` using the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

Because "breaking" isn't self-evident for a project with this shape (a MagicMirror module that is also a reusable framework, per [ADR-001](ADR-001-project-identity.md)), this ADR defines it concretely. A change requires a **major** version bump if it:

- removes or renames a `config.js` option, or changes what a previously accepted value means (a `timing`/`randomizeQuestions`/etc. field, `dataFile`/`dataUrl`, `showCategory`, and so on);
- removes or renames a MagicMirror notification (`NANOQUIZ_NEXT`, `NANOQUIZ_RELOAD`);
- removes or renames a CSS class or custom property documented in the README's Styling table;
- changes what quiz JSON content is required or accepted (a previously valid `questions.json` becomes invalid, or a previously invalid one becomes valid in a way that changes behavior);
- removes or changes the meaning of a CLI command, flag, or exit code (`validate-quiz`/`preview-quiz` and their `npm run` equivalents);
- removes, renames, or changes the contract of a framework object other adapters are meant to depend on (`QuizItem`, `QuizValidator`/`ValidationResult`/`Diagnostic`, a `QuizSource` implementation's `id`/`loadRawItems()` contract, `QuizEngine`'s public methods or snapshot shape, `PresentationStrategy`'s `buildContent` contract), per the Extension Points this project explicitly documents in `docs/Architecture.md`;
- raises the minimum supported Node.js `engines` version.

A change is a **minor** version bump if it adds any of the above in a backward-compatible way (a new optional config field with a sensible default, a new notification, a new documented CSS hook, a new CLI flag, a new quiz item type or presentation strategy, a new `QuizSource` implementation) without changing existing behavior for anyone not using the new thing.

A change is a **patch** version bump if it's a bug fix, a documentation change, an internal refactor, or a dependency/tooling change that doesn't affect any of the surfaces above.

## Alternatives Considered

### No formal policy; rely on ROADMAP.md and commit messages

This is the status quo. It doesn't scale: a consumer would need to read every commit message since their installed version to know whether upgrading is safe, which is exactly the ambiguity the milestone's own Result statement ("clear upgrade expectations") calls out as unacceptable.

### Calendar versioning (date-based version numbers)

Communicates recency, not compatibility. Rejected because the milestone specifically calls for "compatibility expectations," which a date doesn't express at all.

### Stay pre-1.0 indefinitely (keep `0.x.y`, implying anything can break)

Reasonable for a project still finding its shape, but this project has completed 7 of 9 planned milestones with a stable, tested, documented surface across the model, validation, sources, engine, adapter, and CLI layers. Continuing to imply "anything can break" would understate how settled that surface already is, and would work against this milestone's explicit purpose of making that stability visible to consumers.

## Consequences

### Benefits

- Version numbers become meaningful: a consumer can tell from `1.2.0` vs `2.0.0` whether an upgrade needs any attention, without reading commit history.
- `CHANGELOG.md` gives one place to check before upgrading, instead of a raw `git log`.
- Contributors have a concrete rule for how to classify a change's version impact, rather than guessing per change.

### Costs

- After `1.0.0`, a breaking change to any of the surfaces above requires deliberately choosing to make it, bumping the major version, and writing a changelog entry, rather than being made freely as part of routine cleanup.
- `CHANGELOG.md` must be kept up to date for every user-facing change going forward; this is an ongoing discipline, not a one-time task completed by this ADR.

## Related

- [ADR-001: Project Identity](ADR-001-project-identity.md)
- [ADR-002: Increment Development Model](ADR-002-increment-development-model.md)
- [`docs/Architecture.md`](../Architecture.md) — Extension Points section, which this ADR's framework-contract criteria refer to
- [`CHANGELOG.md`](../../CHANGELOG.md)
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — operationalizes this policy for contributors
- [`ROADMAP.md`](../../ROADMAP.md) — Milestone 9
