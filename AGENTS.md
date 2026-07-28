# MagicMirror Module Development Guide

## Project Context
- **Framework**: MagicMirror² module.
- **Language**: JavaScript (ES6+) and standard CSS.
- **Architecture**: Follow standard MagicMirror module lifecycle methods (`start`, `getDom`, `getStyles`, `socketNotificationReceived`).
- **State Management**: Keep module configuration changes confined to the `config` object passed by the core framework.

## Core Commands
- Run Tests & Linting: `npm run check`

## Development Protocol
Always develop new features in a separate appropriately-named branch.

## Development Workflow (TDD)
Follow the Document Intent -> Test Red -> Code Green cycle.
1. **Document Intent**: Before writing code, document the expected behavior and implementation plan.
2. **Write Failing Tests**: Write test cases first. Verify failure via `npm run check`.
3. **Write Code**: Implement minimal JavaScript/CSS to make tests pass.
4. **Verify Green**: Run `npm run check` to ensure zero test or linter failures.

@/Users/jody/MagicMirror/modules/MMM-NanoQuiz/RTK.md
