# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/), per [ADR-005](docs/architecture/ADR-005-versioning-and-compatibility.md).

## [Unreleased]

## [1.0.0] - 2026-07-27

### Added

- CLI quiz-file validator (`npm run validate -- <path>`, `nanoquiz-validate`) that checks a quiz JSON file against the same validation the module applies at runtime, without requiring MagicMirror or a browser.
- CLI terminal quiz preview (`npm run preview -- <path>`, `nanoquiz-preview`) that plays a quiz file's real sequencing, timing, elimination, and answer reveal in the terminal, using the actual `QuizEngine`.
- Preview support for matching an author's real configured `timing`/`randomizeQuestions`/`randomizeChoices`/`avoidImmediateRepeats`, read from the standard install's `config.js` by default, or from an explicit `config.js` or JSON config snippet.
- [`docs/Quiz-Authoring-Guide.md`](docs/Quiz-Authoring-Guide.md): a dedicated guide for quiz content authors, covering the content format, a full worked `questions.json` example, both CLI tools with sample output, and a diagnostic-to-fix table.
- [ADR-004](docs/architecture/ADR-004-host-entry-points.md): host entry point placement policy.
- [ADR-005](docs/architecture/ADR-005-versioning-and-compatibility.md): Semantic Versioning and compatibility policy (this release).

### Changed

- `formatDiagnostic` is now shared between both CLI tools and the running module's adapter, so a diagnostic reads identically no matter which surface reports it.

### Fixed

- The CLI preview no longer crashes when a `config.js`'s `modules` list is missing, non-array, or contains null/non-object entries; it now fails cleanly or falls back to defaults as appropriate.
- CLI usage messages now match the documented `npm run validate`/`npm run preview` invocation instead of a command name that didn't correspond to anything published.

## [0.1.0] - 2026-07-26

Initial pre-release.

### Added

- Immutable quiz model and validation: `QuizItem`, `ValidationResult`, and `Diagnostic` value objects, and a `QuizValidator` supporting one-answer and multiple-choice items with structured error and warning diagnostics.
- Quiz source abstraction: `MemorySource`, `LocalJsonSource`, and `RemoteJsonSource` for obtaining raw quiz definitions from memory, a local file, or a remote URL.
- Presentation engine: a renderer-independent `QuizEngine` handling sequential or randomized sequencing (with an avoid-immediate-repeat option), phase timing, multiple-choice elimination order, and answer reveal, with autonomous `start()`/`pause()`/`resume()`/`skipToNext()` control.
- Presentation strategies: `QuestionAnswerPresentation` and `MultipleChoicePresentation`, factoring per-item-type DOM rendering out of the main module file.
- The `MMM-NanoQuiz` MagicMirror module: displays rotating one-answer and multiple-choice quiz questions with configurable timing, category and explanation display, a progress counter, and CSS-customizable styling; supports `NANOQUIZ_NEXT` and `NANOQUIZ_RELOAD` notifications; loads quiz content from a local file or a remote URL with optional periodic reloading.
- Project documentation: README, `docs/Architecture.md`, `VISION.md`, `ROADMAP.md`, and ADR-001 through ADR-003 covering project identity, the increment development model, and the MagicMirror ESM bridge.
