# Claude Collaboration Guide

## Guidelines & Scope
- **Rule Source**: Inherit and follow all technical guidelines, commands, and TDD steps outlined in `AGENTS.md`.
- **Scope Limit**: Only modify files directly related to the current feature. Do not refactor unrelated code unless explicitly asked.

## Interactive Guardrails
- **Risk Check**: Wait for user confirmation after Step 1 (Document Intent) if the change is high-risk.
- **Feature Pauses**: Stop and ask the user for approval after Step 4 (Verify Green) before moving to the next feature or refactoring.
- **Git Operations**: Do not commit changes unless explicitly instructed to do so.
