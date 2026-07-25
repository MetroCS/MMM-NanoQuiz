import assert from "node:assert/strict";
import test from "node:test";

test("MagicMirror validation adapter exposes the validator bridge globally", async () => {
    delete globalThis.NanoQuizAdapter;

    await import("../src/adapter/MagicMirrorValidationAdapter.mjs");

    assert.equal(typeof globalThis.NanoQuizAdapter.validateNanoQuizItems, "function");
});

test("MagicMirror validation adapter delegates to source validation", async () => {
    const warnings = [];

    await import("../src/adapter/MagicMirrorValidationAdapter.mjs");
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
