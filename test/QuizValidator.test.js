import assert from "node:assert/strict";
import test from "node:test";

import { QuizItem } from "../src/model/QuizItem.js";
import { ValidationResult } from "../src/validation/ValidationResult.js";
import { QuizValidator } from "../src/validation/QuizValidator.js";

test("QuizValidator creates quiz items from well-formed question and answer definitions", () => {
    const result = new QuizValidator().validate([
        {
            question: "Capital of France?",
            answer: "Paris"
        },
        {
            question: "Largest planet?",
            answer: "Jupiter",
            category: "Astronomy",
            explanation: "Jupiter is the largest planet in the Solar System."
        }
    ]);

    assert.ok(result instanceof ValidationResult);
    assert.equal(result.isValid, true);
    assert.equal(result.diagnostics.length, 0);
    assert.equal(result.items.length, 2);
    assert.ok(result.items[0] instanceof QuizItem);
    assert.equal(result.items[0].type, "oneAnswer");
    assert.equal(result.items[0].question, "Capital of France?");
    assert.equal(result.items[0].answer, "Paris");
    assert.equal(result.items[0].category, "");
    assert.equal(result.items[0].explanation, "");
    assert.ok(result.items[1] instanceof QuizItem);
    assert.equal(result.items[1].type, "oneAnswer");
    assert.equal(result.items[1].question, "Largest planet?");
    assert.equal(result.items[1].answer, "Jupiter");
    assert.equal(result.items[1].category, "Astronomy");
    assert.equal(result.items[1].explanation, "Jupiter is the largest planet in the Solar System.");
});

test("QuizValidator does not mutate caller-owned definitions", () => {
    const rawItems = [
        {
            question: "Capital of Spain?",
            answer: "Madrid",
            category: "Geography"
        }
    ];
    const beforeValidation = rawItems.map((rawItem) => ({ ...rawItem }));

    new QuizValidator().validate(rawItems);

    assert.deepEqual(rawItems, beforeValidation);
});
