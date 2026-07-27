import assert from "node:assert/strict";
import test from "node:test";

import { formatDiagnostic } from "../src/validation/formatDiagnostic.js";
import { Diagnostic, DiagnosticSeverity } from "../src/validation/Diagnostic.js";

test("formatDiagnostic includes source, item position, and field when present", () => {
    const diagnostic = new Diagnostic({
        severity: DiagnosticSeverity.ERROR,
        code: "item.question.required",
        message: "Quiz item must include a non-empty question.",
        source: "questions.json",
        itemIndex: 0,
        field: "question"
    });

    assert.equal(
        formatDiagnostic(diagnostic),
        "[error] questions.json, item 1, question: Quiz item must include a non-empty question."
    );
});

test("formatDiagnostic omits missing location parts", () => {
    const diagnostic = new Diagnostic({
        severity: DiagnosticSeverity.ERROR,
        code: "source.notArray",
        message: "Raw quiz definitions must be an array."
    });

    assert.equal(formatDiagnostic(diagnostic), "[error] Raw quiz definitions must be an array.");
});
