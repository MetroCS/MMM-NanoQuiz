import assert from "node:assert/strict";
import test from "node:test";

import { QuizItem } from "../src/model/QuizItem.js";
import { Diagnostic, DiagnosticSeverity } from "../src/validation/Diagnostic.js";
import { ValidationResult } from "../src/validation/ValidationResult.js";

test("ValidationResult stores immutable items and diagnostics", () => {
    const item = new QuizItem({
        type: "oneAnswer",
        question: "Capital of France?",
        answer: "Paris"
    });
    const diagnostic = new Diagnostic({
        severity: DiagnosticSeverity.WARNING,
        code: "item.explanation.missing",
        message: "Quiz item has no explanation."
    });
    const result = new ValidationResult({
        items: [item],
        diagnostics: [diagnostic]
    });

    assert.deepEqual(result.items, [item]);
    assert.deepEqual(result.diagnostics, [diagnostic]);
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.items));
    assert.ok(Object.isFrozen(result.diagnostics));
});

test("ValidationResult separates errors and warnings", () => {
    const error = new Diagnostic({
        severity: DiagnosticSeverity.ERROR,
        code: "item.question.required",
        message: "Quiz item must include a question."
    });
    const warning = new Diagnostic({
        severity: DiagnosticSeverity.WARNING,
        code: "item.explanation.missing",
        message: "Quiz item has no explanation."
    });
    const result = new ValidationResult({
        diagnostics: [error, warning]
    });

    assert.equal(result.isValid, false);
    assert.deepEqual(result.errors, [error]);
    assert.deepEqual(result.warnings, [warning]);
    assert.ok(Object.isFrozen(result.errors));
    assert.ok(Object.isFrozen(result.warnings));
});

test("ValidationResult is valid when no errors are present", () => {
    const warning = new Diagnostic({
        severity: DiagnosticSeverity.WARNING,
        code: "item.explanation.missing",
        message: "Quiz item has no explanation."
    });

    assert.equal(new ValidationResult({}).isValid, true);
    assert.equal(new ValidationResult({ diagnostics: [warning] }).isValid, true);
});
