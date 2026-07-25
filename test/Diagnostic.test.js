import assert from "node:assert/strict";
import test from "node:test";

import { Diagnostic, DiagnosticSeverity } from "../src/validation/Diagnostic.js";

test("Diagnostic stores immutable validation feedback", () => {
    const diagnostic = new Diagnostic({
        severity: DiagnosticSeverity.ERROR,
        code: "item.question.required",
        message: "Quiz item must include a question.",
        source: "questions.json",
        itemIndex: 2,
        field: "question"
    });

    assert.equal(diagnostic.severity, DiagnosticSeverity.ERROR);
    assert.equal(diagnostic.code, "item.question.required");
    assert.equal(diagnostic.message, "Quiz item must include a question.");
    assert.equal(diagnostic.source, "questions.json");
    assert.equal(diagnostic.itemIndex, 2);
    assert.equal(diagnostic.field, "question");
    assert.ok(Object.isFrozen(diagnostic));
});

test("Diagnostic defaults optional location context", () => {
    const diagnostic = new Diagnostic({
        severity: DiagnosticSeverity.WARNING,
        code: "item.explanation.missing",
        message: "Quiz item has no explanation."
    });

    assert.equal(diagnostic.source, null);
    assert.equal(diagnostic.itemIndex, null);
    assert.equal(diagnostic.field, null);
});

test("DiagnosticSeverity exposes immutable supported severities", () => {
    assert.deepEqual(DiagnosticSeverity, {
        ERROR: "error",
        WARNING: "warning"
    });
    assert.ok(Object.isFrozen(DiagnosticSeverity));
});
