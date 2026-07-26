import assert from "node:assert/strict";
import test from "node:test";

import { loadNanoQuizItems } from "../src/adapter/loadNanoQuizItems.js";

test("loadNanoQuizItems loads local dataFile sources through resolved module paths", async () => {
    const requested = [];
    const warnings = [];
    const items = await loadNanoQuizItems({
        config: {
            dataFile: "questions.json",
            dataUrl: null
        },
        resolveFile(file) {
            return `/modules/MMM-NanoQuiz/${file}`;
        },
        async requestText(source) {
            requested.push(source);
            return JSON.stringify([
                {
                    question: "Capital of France?",
                    answer: "Paris"
                }
            ]);
        },
        logger: {
            warn(message) {
                warnings.push(message);
            }
        }
    });

    assert.equal(items.length, 1);
    assert.equal(items[0].question, "Capital of France?");
    assert.deepEqual(requested, ["/modules/MMM-NanoQuiz/questions.json"]);
    assert.deepEqual(warnings, []);
});

test("loadNanoQuizItems prefers remote dataUrl sources", async () => {
    const requested = [];
    const warnings = [];
    const items = await loadNanoQuizItems({
        config: {
            dataFile: "questions.json",
            dataUrl: "https://example.test/questions.json"
        },
        resolveFile(file) {
            return `/modules/MMM-NanoQuiz/${file}`;
        },
        async requestText(source) {
            requested.push(source);
            return JSON.stringify([
                {
                    question: "Which planet is known as the Red Planet?",
                    answer: "Mars",
                    choices: ["Mercury", "Venus", "Earth", "Mars"]
                }
            ]);
        },
        logger: {
            warn(message) {
                warnings.push(message);
            }
        }
    });

    assert.equal(items.length, 1);
    assert.equal(items[0].type, "multipleChoice");
    assert.deepEqual(requested, ["https://example.test/questions.json"]);
    assert.deepEqual(warnings, [
        "Both dataUrl and dataFile are configured; using dataUrl."
    ]);
});

test("loadNanoQuizItems logs validation diagnostics with selected source context", async () => {
    const warnings = [];

    const items = await loadNanoQuizItems({
        config: {
            dataFile: "questions.json",
            dataUrl: null
        },
        resolveFile(file) {
            return `/modules/MMM-NanoQuiz/${file}`;
        },
        async requestText() {
            return JSON.stringify([
                {
                    answer: "Paris"
                },
                {
                    question: "Capital of France?",
                    answer: "Paris"
                }
            ]);
        },
        logger: {
            warn(message) {
                warnings.push(message);
            }
        }
    });

    assert.equal(items.length, 1);
    assert.deepEqual(warnings, [
        "[error] /modules/MMM-NanoQuiz/questions.json, item 1, question: Quiz item must include a non-empty question."
    ]);
});

test("loadNanoQuizItems preserves source-specific load failures", async () => {
    await assert.rejects(
        () => loadNanoQuizItems({
            config: {
                dataFile: "missing.json",
                dataUrl: null
            },
            resolveFile(file) {
                return `/modules/MMM-NanoQuiz/${file}`;
            },
            async requestText() {
                throw new Error("HTTP 404");
            },
            logger: {
                warn() {}
            }
        }),
        /Unable to read quiz source \/modules\/MMM-NanoQuiz\/missing\.json: HTTP 404/
    );
});

test("loadNanoQuizItems reports missing source configuration explicitly", async () => {
    await assert.rejects(
        () => loadNanoQuizItems({
            config: {
                dataFile: null,
                dataUrl: null
            },
            resolveFile(file) {
                return `/modules/MMM-NanoQuiz/${file}`;
            },
            async requestText() {
                return "[]";
            },
            logger: {
                warn() {}
            }
        }),
        /NanoQuiz requires either dataUrl or dataFile to be configured\./
    );
});
