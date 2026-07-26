import assert from "node:assert/strict";
import test from "node:test";

import { createQuizEngine } from "../src/adapter/createQuizEngine.js";
import { QuizEnginePhase } from "../src/engine/QuizEngine.js";
import { QuizItem } from "../src/model/QuizItem.js";

test("createQuizEngine creates an engine configured for MagicMirror question order", () => {
    const firstItem = new QuizItem({
        question: "First?",
        answer: "Answer"
    });
    const secondItem = new QuizItem({
        question: "Second?",
        answer: "Answer"
    });
    const engine = createQuizEngine([firstItem, secondItem], {
        randomizeQuestions: false
    });

    assert.deepEqual(engine.advanceToNextItem(), {
        phase: QuizEnginePhase.QUESTION,
        currentIndex: 0,
        currentItem: firstItem,
        eliminatedChoiceIndexes: [],
        itemCount: 2
    });
});

test("createQuizEngine creates an engine configured for MagicMirror choice order", () => {
    const multipleChoiceItem = new QuizItem({
        type: "multipleChoice",
        question: "Pick a letter",
        answer: "C",
        choices: ["A", "B", "C", "D"]
    });
    const randomValues = [0.1, 0.9, 0.4];
    const engine = createQuizEngine([multipleChoiceItem], {
        random: () => randomValues.shift(),
        randomizeChoices: true,
        randomizeQuestions: false
    });

    assert.deepEqual(engine.advanceToNextItem().currentItem.choices, [
        "B",
        "D",
        "C",
        "A"
    ]);
});
