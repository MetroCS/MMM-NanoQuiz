import assert from "node:assert/strict";
import test from "node:test";

import { validateNanoQuizItems } from "../src/adapter/validateNanoQuizItems.js";

test("validateNanoQuizItems returns accepted quiz items", () => {
    const warnings = [];
    const items = validateNanoQuizItems([
        {
            question: "Capital of France?",
            answer: "Paris"
        },
        {
            question: "Which planet is known as the Red Planet?",
            answer: "Mars",
            choices: ["Mercury", "Venus", "Earth", "Mars"]
        }
    ], {
        source: "questions.json",
        logger: {
            warn(message) {
                warnings.push(message);
            }
        }
    });

    assert.equal(items.length, 2);
    assert.equal(items[0].type, "oneAnswer");
    assert.equal(items[1].type, "multipleChoice");
    assert.deepEqual(warnings, []);
});

test("validateNanoQuizItems logs validator diagnostics with source context", () => {
    const warnings = [];
    const items = validateNanoQuizItems([
        {
            question: "",
            answer: "Paris"
        },
        {
            question: "Capital of France?",
            answer: "Paris",
            category: 42
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
    assert.deepEqual(warnings, [
        "[error] questions.json, item 1, question: Quiz item must include a non-empty question.",
        "[warning] questions.json, item 2, category: Quiz item category must be a string when present."
    ]);
});
