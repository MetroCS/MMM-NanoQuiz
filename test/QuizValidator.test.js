import assert from "node:assert/strict";
import test from "node:test";

import { QuizItem } from "../src/model/QuizItem.js";
import { DiagnosticSeverity } from "../src/validation/Diagnostic.js";
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

test("QuizValidator reports an error when raw definitions are not an array", () => {
    const result = new QuizValidator().validate({
        question: "Capital of France?",
        answer: "Paris"
    });

    assert.equal(result.isValid, false);
    assert.deepEqual(result.items, []);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].severity, DiagnosticSeverity.ERROR);
    assert.equal(result.errors[0].code, "source.notArray");
    assert.equal(result.errors[0].source, null);
    assert.equal(result.errors[0].itemIndex, null);
    assert.equal(result.errors[0].field, null);
});

test("QuizValidator reports item shape errors without creating invalid quiz items", () => {
    const result = new QuizValidator().validate([
        {
            question: "Capital of France?",
            answer: "Paris"
        },
        null,
        ["not an item"],
        "not an item"
    ]);

    assert.equal(result.isValid, false);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].question, "Capital of France?");
    assert.deepEqual(
        result.errors.map((diagnostic) => ({
            code: diagnostic.code,
            itemIndex: diagnostic.itemIndex,
            field: diagnostic.field
        })),
        [
            {
                code: "item.notObject",
                itemIndex: 1,
                field: null
            },
            {
                code: "item.notObject",
                itemIndex: 2,
                field: null
            },
            {
                code: "item.notObject",
                itemIndex: 3,
                field: null
            }
        ]
    );
});

test("QuizValidator reports missing question and answer fields", () => {
    const result = new QuizValidator().validate([
        {
            answer: "Paris"
        },
        {
            question: "Capital of France?"
        },
        {
            question: "",
            answer: ""
        }
    ]);

    assert.equal(result.isValid, false);
    assert.equal(result.items.length, 0);
    assert.deepEqual(
        result.errors.map((diagnostic) => ({
            code: diagnostic.code,
            itemIndex: diagnostic.itemIndex,
            field: diagnostic.field
        })),
        [
            {
                code: "item.question.required",
                itemIndex: 0,
                field: "question"
            },
            {
                code: "item.answer.required",
                itemIndex: 1,
                field: "answer"
            },
            {
                code: "item.question.required",
                itemIndex: 2,
                field: "question"
            },
            {
                code: "item.answer.required",
                itemIndex: 2,
                field: "answer"
            }
        ]
    );
});

test("QuizValidator trims accepted string fields", () => {
    const result = new QuizValidator().validate([
        {
            question: "  Capital of France?  ",
            answer: "  Paris  ",
            category: "  Geography  ",
            explanation: "  Paris is the capital and largest city of France.  "
        }
    ]);

    assert.equal(result.isValid, true);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].question, "Capital of France?");
    assert.equal(result.items[0].answer, "Paris");
    assert.equal(result.items[0].category, "Geography");
    assert.equal(result.items[0].explanation, "Paris is the capital and largest city of France.");
});

test("QuizValidator treats whitespace-only required fields as missing", () => {
    const result = new QuizValidator().validate([
        {
            question: "   ",
            answer: "\t"
        }
    ]);

    assert.equal(result.isValid, false);
    assert.equal(result.items.length, 0);
    assert.deepEqual(
        result.errors.map((diagnostic) => ({
            code: diagnostic.code,
            itemIndex: diagnostic.itemIndex,
            field: diagnostic.field
        })),
        [
            {
                code: "item.question.required",
                itemIndex: 0,
                field: "question"
            },
            {
                code: "item.answer.required",
                itemIndex: 0,
                field: "answer"
            }
        ]
    );
});

test("QuizValidator warns when optional text fields are present but not strings", () => {
    const result = new QuizValidator().validate([
        {
            question: "Capital of France?",
            answer: "Paris",
            category: 42,
            explanation: { text: "Paris is the capital of France." }
        }
    ]);

    assert.equal(result.isValid, true);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].category, "");
    assert.equal(result.items[0].explanation, "");
    assert.deepEqual(result.errors, []);
    assert.deepEqual(
        result.warnings.map((diagnostic) => ({
            severity: diagnostic.severity,
            code: diagnostic.code,
            itemIndex: diagnostic.itemIndex,
            field: diagnostic.field
        })),
        [
            {
                severity: DiagnosticSeverity.WARNING,
                code: "item.category.ignored",
                itemIndex: 0,
                field: "category"
            },
            {
                severity: DiagnosticSeverity.WARNING,
                code: "item.explanation.ignored",
                itemIndex: 0,
                field: "explanation"
            }
        ]
    );
});

test("QuizValidator does not warn when optional text fields are omitted", () => {
    const result = new QuizValidator().validate([
        {
            question: "Capital of France?",
            answer: "Paris"
        }
    ]);

    assert.equal(result.isValid, true);
    assert.deepEqual(result.warnings, []);
});
