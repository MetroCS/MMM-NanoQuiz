import assert from "node:assert/strict";
import test from "node:test";

import { runValidateQuizCli } from "../src/cli/runValidateQuizCli.js";
import { ValidationResult } from "../src/validation/ValidationResult.js";
import { Diagnostic, DiagnosticSeverity } from "../src/validation/Diagnostic.js";
import { QuizItem } from "../src/model/QuizItem.js";

test("runValidateQuizCli reports usage and fails when no file is given", async () => {
    const errorLines = [];

    const exitCode = await runValidateQuizCli([], {
        writeErrorLine: (line) => errorLines.push(line)
    });

    assert.equal(exitCode, 1);
    assert.deepEqual(errorLines, ["Usage: validate-quiz <path-to-quiz-file.json>"]);
});

test("runValidateQuizCli reports validation failures and exits non-zero", async () => {
    const errorLines = [];

    const exitCode = await runValidateQuizCli(["missing.json"], {
        validate: async () => {
            throw new Error("Unable to read missing.json: ENOENT");
        },
        writeErrorLine: (line) => errorLines.push(line)
    });

    assert.equal(exitCode, 1);
    assert.deepEqual(errorLines, ["Unable to read missing.json: ENOENT"]);
});

test("runValidateQuizCli prints diagnostics and a summary, succeeding when valid", async () => {
    const lines = [];
    const result = new ValidationResult({
        items: [new QuizItem({ question: "Capital of France?", answer: "Paris", type: "oneAnswer" })],
        diagnostics: [
            new Diagnostic({
                severity: DiagnosticSeverity.WARNING,
                code: "item.category.ignored",
                message: "Quiz item category must be a string when present.",
                source: "questions.json",
                itemIndex: 1,
                field: "category"
            })
        ]
    });

    const exitCode = await runValidateQuizCli(["questions.json"], {
        validate: async (filePath) => {
            assert.equal(filePath, "questions.json");
            return result;
        },
        writeLine: (line) => lines.push(line)
    });

    assert.equal(exitCode, 0);
    assert.deepEqual(lines, [
        "[warning] questions.json, item 2, category: Quiz item category must be a string when present.",
        "1 valid item(s), 0 error(s), 1 warning(s)."
    ]);
});

test("runValidateQuizCli exits non-zero when the validation result has errors", async () => {
    const lines = [];
    const result = new ValidationResult({
        items: [],
        diagnostics: [
            new Diagnostic({
                severity: DiagnosticSeverity.ERROR,
                code: "item.question.required",
                message: "Quiz item must include a non-empty question.",
                source: "questions.json",
                itemIndex: 0,
                field: "question"
            })
        ]
    });

    const exitCode = await runValidateQuizCli(["questions.json"], {
        validate: async () => result,
        writeLine: (line) => lines.push(line)
    });

    assert.equal(exitCode, 1);
    assert.deepEqual(lines, [
        "[error] questions.json, item 1, question: Quiz item must include a non-empty question.",
        "0 valid item(s), 1 error(s), 0 warning(s)."
    ]);
});
