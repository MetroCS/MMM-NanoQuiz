import assert from "node:assert/strict";
import test from "node:test";

import { QuizItem } from "../src/model/QuizItem.js";

test("QuizItem stores immutable quiz content", () => {
    const item = new QuizItem({
        type: "multipleChoice",
        question: "What is 2 + 2?",
        answer: "4",
        choices: ["1", "2", "3", "4"],
        category: "Math",
        explanation: "Two pairs make four."
    });

    assert.equal(item.type, "multipleChoice");
    assert.equal(item.question, "What is 2 + 2?");
    assert.equal(item.answer, "4");
    assert.deepEqual(item.choices, ["1", "2", "3", "4"]);
    assert.equal(item.category, "Math");
    assert.equal(item.explanation, "Two pairs make four.");
    assert.ok(Object.isFrozen(item));
    assert.ok(Object.isFrozen(item.choices));
});

test("QuizItem defaults optional content", () => {
    const item = new QuizItem({
        type: "oneAnswer",
        question: "Capital of France?",
        answer: "Paris"
    });

    assert.deepEqual(item.choices, []);
    assert.equal(item.category, "");
    assert.equal(item.explanation, "");
});
