import assert from "node:assert/strict";
import test from "node:test";

test("MagicMirror adapter exposes the bridge globally", async () => {
    delete globalThis.NanoQuizAdapter;

    await import("../src/adapter/MagicMirrorAdapter.mjs");

    assert.equal(typeof globalThis.NanoQuizAdapter.createQuizEngine, "function");
    assert.equal(typeof globalThis.NanoQuizAdapter.loadNanoQuizItems, "function");
    assert.equal(typeof globalThis.NanoQuizAdapter.validateNanoQuizItems, "function");
    assert.equal(typeof globalThis.NanoQuizAdapter.presentationStrategyFor, "function");
});

test("MagicMirror adapter delegates to source validation", async () => {
    const warnings = [];

    await import("../src/adapter/MagicMirrorAdapter.mjs");
    const items = globalThis.NanoQuizAdapter.validateNanoQuizItems([
        {
            answer: "Paris"
        },
        {
            question: "Capital of France?",
            answer: "Paris"
        }
    ], {
        source: "questions.json",
        logger: {
            warn(message) {
                warnings.push(message);
            }
        }
    });

    assert.equal(items.length, 1);
    assert.equal(items[0].question, "Capital of France?");
    assert.deepEqual(warnings, [
        "[error] questions.json, item 1, question: Quiz item must include a non-empty question."
    ]);
});
