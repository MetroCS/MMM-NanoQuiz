import assert from "node:assert/strict";
import test from "node:test";

import { runPreviewQuizCli } from "../src/cli/runPreviewQuizCli.js";
import { ValidationResult } from "../src/validation/ValidationResult.js";
import { Diagnostic, DiagnosticSeverity } from "../src/validation/Diagnostic.js";
import { QuizItem } from "../src/model/QuizItem.js";
import { QuizEnginePhase } from "../src/engine/QuizEngine.js";

test("runPreviewQuizCli reports usage and fails when no file is given", async () => {
    const errorLines = [];

    const exitCode = await runPreviewQuizCli([], {
        writeErrorLine: (line) => errorLines.push(line)
    });

    assert.equal(exitCode, 1);
    assert.deepEqual(errorLines, ["Usage: preview-quiz <path-to-quiz-file.json> [path-to-config-source]"]);
});

test("runPreviewQuizCli reports validation failures and exits non-zero", async () => {
    const errorLines = [];

    const exitCode = await runPreviewQuizCli(["missing.json"], {
        validate: async () => {
            throw new Error("Unable to read missing.json: ENOENT");
        },
        writeErrorLine: (line) => errorLines.push(line)
    });

    assert.equal(exitCode, 1);
    assert.deepEqual(errorLines, ["Unable to read missing.json: ENOENT"]);
});

test("runPreviewQuizCli refuses to start when there are no valid items", async () => {
    const lines = [];
    const errorLines = [];
    let engineCreated = false;

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

    const exitCode = await runPreviewQuizCli(["questions.json"], {
        validate: async () => result,
        createEngine: () => {
            engineCreated = true;
            return { start: () => {} };
        },
        writeLine: (line) => lines.push(line),
        writeErrorLine: (line) => errorLines.push(line)
    });

    assert.equal(exitCode, 1);
    assert.equal(engineCreated, false);
    assert.deepEqual(lines, [
        "[error] questions.json, item 1, question: Quiz item must include a non-empty question."
    ]);
    assert.deepEqual(errorLines, ["Cannot preview: no valid quiz items."]);
});

test("runPreviewQuizCli prints diagnostics, then starts the engine and prints each snapshot", async () => {
    const lines = [];
    const item = new QuizItem({
        type: "oneAnswer",
        question: "Capital of France?",
        answer: "Paris"
    });

    const result = new ValidationResult({
        items: [item],
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

    const snapshots = [
        {
            phase: QuizEnginePhase.QUESTION,
            currentItem: item,
            currentIndex: 0,
            itemCount: 1,
            eliminatedChoiceIndexes: []
        },
        {
            phase: QuizEnginePhase.ANSWER,
            currentItem: item,
            currentIndex: 0,
            itemCount: 1,
            eliminatedChoiceIndexes: []
        }
    ];

    let startedWithItems = null;
    let startedWithOptions = null;

    const exitCode = await runPreviewQuizCli(["questions.json"], {
        validate: async () => result,
        loadEngineOptions: async () => ({}),
        createEngine: (items, options) => {
            startedWithItems = items;
            startedWithOptions = options;
            return {
                start: ({ onChange }) => {
                    snapshots.forEach((snapshot) => onChange(snapshot));
                }
            };
        },
        writeLine: (line) => lines.push(line)
    });

    assert.equal(exitCode, 0);
    assert.deepEqual(startedWithItems, [item]);
    assert.deepEqual(startedWithOptions, {});
    assert.deepEqual(lines, [
        "[warning] questions.json, item 2, category: Quiz item category must be a string when present.",
        "[1/1] Question: Capital of France?",
        "[1/1] Answer: Paris"
    ]);
});

test("runPreviewQuizCli loads engine options using the optional config-source argument", async () => {
    const item = new QuizItem({ type: "oneAnswer", question: "Capital of France?", answer: "Paris" });
    const result = new ValidationResult({ items: [item], diagnostics: [] });
    const engineOptions = { randomizeChoices: true };

    let requestedConfigSource = null;
    let startedWithOptions = null;

    const exitCode = await runPreviewQuizCli(["questions.json", "config.js"], {
        validate: async () => result,
        loadEngineOptions: async (configSourcePath) => {
            requestedConfigSource = configSourcePath;
            return engineOptions;
        },
        createEngine: (items, options) => {
            startedWithOptions = options;
            return { start: () => {} };
        }
    });

    assert.equal(exitCode, 0);
    assert.equal(requestedConfigSource, "config.js");
    assert.deepEqual(startedWithOptions, engineOptions);
});

test("runPreviewQuizCli reports a config-source failure and exits non-zero without starting the engine", async () => {
    const item = new QuizItem({ type: "oneAnswer", question: "Capital of France?", answer: "Paris" });
    const result = new ValidationResult({ items: [item], diagnostics: [] });
    const errorLines = [];
    let engineCreated = false;

    const exitCode = await runPreviewQuizCli(["questions.json", "config.js"], {
        validate: async () => result,
        loadEngineOptions: async () => {
            throw new Error('No "MMM-NanoQuiz" module entry found in config.js.');
        },
        createEngine: () => {
            engineCreated = true;
            return { start: () => {} };
        },
        writeErrorLine: (line) => errorLines.push(line)
    });

    assert.equal(exitCode, 1);
    assert.equal(engineCreated, false);
    assert.deepEqual(errorLines, ['No "MMM-NanoQuiz" module entry found in config.js.']);
});
