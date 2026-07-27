# Contributing to MMM-NanoQuiz

Thanks for considering a contribution. This project is an educational quiz framework with MagicMirror as its first adapter (see [`VISION.md`](VISION.md)), developed through a deliberate, documented process (see [ADR-002](docs/architecture/ADR-002-increment-development-model.md)). This guide covers how to contribute code or documentation; if you're only writing quiz content for your own install, see the [Quiz Authoring Guide](docs/Quiz-Authoring-Guide.md) instead.

## Reporting issues

Open a GitHub issue with what you expected, what happened instead, and how to reproduce it. For anything about how a quiz displays or times, please also note whether `npm run preview -- <path>` (see the [Quiz Authoring Guide](docs/Quiz-Authoring-Guide.md)) reproduces it. That helps tell a framework-level issue apart from a MagicMirror-specific one.

## Before you start

- Skim [`VISION.md`](VISION.md) and [`docs/Architecture.md`](docs/Architecture.md) so a change fits the project's shape rather than working against it. In particular, framework code under `src/` (model, validation, sources, engine, CLI authoring tools) must not depend on MagicMirror globals, browser DOM APIs, the filesystem, or the network directly — see Architecture.md's Dependency Rules.
- Check [`ROADMAP.md`](ROADMAP.md) for the current milestone, so unrelated work doesn't collide with it.
- For anything that involves a real design decision with alternatives worth weighing (not just an implementation detail), expect to write or extend an [ADR](docs/architecture/) rather than only changing code.

## Development process

Follow [ADR-002](docs/architecture/ADR-002-increment-development-model.md)'s cycle for any substantive change:

1. **Intent** — state what the change is for and its boundaries (in the issue, PR description, or both).
2. **Documentation** — update or add the relevant doc at the level needed to guide the change: `ROADMAP.md`'s "Current increment" note, `docs/Architecture.md`, or a new ADR under `docs/architecture/` for a genuine design decision.
3. **Tests** — write tests that express the new or changed behavior, and confirm they fail against the current code.
4. **Implementation** — add the smallest coherent change that makes those tests pass.
5. **Verification** — run `npm run check` (lint plus the full test suite) and confirm the documentation still matches the resulting system.

An increment isn't complete until its documentation, tests, and implementation agree with each other.

## Setting up

```sh
git clone https://github.com/MetroCS/MMM-NanoQuiz.git
cd MMM-NanoQuiz
npm install
npm run check
```

`test/node_helper.test.js` requires MagicMirror's own `js/node_helper.js` and `js/alias-resolver`, so it only passes when this module is checked out inside a real MagicMirror installation's `modules/` directory (see the README's Development section); a failure there alone, outside such an install, isn't a regression in your change.

## Coding conventions

- Plain JavaScript (ES6+ modules), no bundler or transpiler. The project has zero runtime dependencies; think carefully before adding one, even as a `devDependency`.
- `npm run lint` (ESLint, via `eslint.config.js`) is authoritative for style; run it rather than guessing at conventions.
- Keep host-specific code (the MagicMirror adapter, CLI entry points under `bin/`) thin. Put real logic in `src/`, with I/O (file reads, network requests, timers) passed in as injectable defaults, so it's testable without a browser, filesystem, or network — see `validateQuizFile`, `runValidateQuizCli`, or `QuizEngine`'s injected `scheduleTimeout`/`clearTimeout` for existing examples.
- A new host entry point follows [ADR-004](docs/architecture/ADR-004-host-entry-points.md): place and name it per that host platform's own convention (for example, Node's `bin/` for a CLI tool), not a scheme invented for this project.

## Branching and pull requests

- Work in a feature branch (`feature/<short-name>`) rather than directly on `main`, for anything beyond a trivial fix.
- Keep a pull request scoped to one coherent increment. Update `ROADMAP.md`'s "Current increment" note (and `docs/Architecture.md` or an ADR, if applicable) in the same PR as the code, not as separate follow-up work.
- Make sure `npm run check` passes before opening the PR.
- Add a `CHANGELOG.md` entry under an `## [Unreleased]` heading as part of the PR (see Versioning and compatibility, below); it gets moved under a version heading at release time.

## Versioning and compatibility

This project follows [Semantic Versioning](https://semver.org/), per [ADR-005](docs/architecture/ADR-005-versioning-and-compatibility.md). Before opening a PR, work out which kind of change yours is, and say so in the PR description:

- **Breaking (major):** removes or renames a `config.js` option, a MagicMirror notification, a documented CSS class or custom property, changes what quiz JSON content is valid, changes a CLI command/flag/exit code, or changes the contract of a framework object other adapters are meant to depend on (`QuizItem`, `QuizValidator`/`ValidationResult`/`Diagnostic`, `QuizSource`, `QuizEngine`, `PresentationStrategy`).
- **Additive (minor):** adds any of the above in a way that doesn't change existing behavior for anyone not using the new thing.
- **Internal (patch):** a bug fix, documentation change, internal refactor, or dependency/tooling update that doesn't touch the surfaces above.

See ADR-005 for the full definitions and the reasoning behind them.

## Questions

`VISION.md`, `docs/Architecture.md`, and the ADRs under `docs/architecture/` are the first place to look for "why does it work this way." If a question isn't answered there, open an issue.
