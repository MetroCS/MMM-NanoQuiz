# Claude Collaboration Guide - MagicMirror Module

## Development Workflow (TDD)
Follow the Document Intent -> Test Red -> Code Green cycle. Do not skip steps.

1. **Document Intent**: Before writing code, document the expected behavior and your implementation plan. Wait for user confirmation if the change is high-risk.
2. **Write Failing Tests**: Write the test cases first. Run the tests to verify they fail (`npm run check`).
3. **Write Code**: Implement the minimal amount of JavaScript/CSS code required to make the tests pass.
4. **Verify Green**: Run `npm run check` again. Ensure all tests pass and no linter errors exist.
5. **Pause**: Stop and ask the user for approval before moving to the next feature or refactoring. Do not commit changes unless explicitly instructed to do so.

## Commands
- **Run Tests / Linting**: `npm run check`

## Code Style & Architecture
- **Framework Context**: This is a MagicMirror² module. Follow standard MagicMirror module lifecycle methods (`start`, `getDom`, `getStyles`, `socketNotificationReceived`).
- **Language**: JavaScript (ES6+) and standard CSS.
- **Scope**: Only modify files directly related to the current feature. Do not refactor unrelated code unless explicitly asked.
- **State Management**: Keep module configuration changes confined to the `config` object passed by the core framework.
