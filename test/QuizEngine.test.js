import assert from "node:assert/strict";
import test from "node:test";

import { QuizEngine, QuizEnginePhase } from "../src/engine/QuizEngine.js";
import { QuizItem } from "../src/model/QuizItem.js";

function item(question) {
    return new QuizItem({
        question,
        answer: "Answer"
    });
}

test("QuizEngine starts empty when no items are available", () => {
    const engine = new QuizEngine([]);

    assert.deepEqual(engine.getSnapshot(), {
        phase: QuizEnginePhase.EMPTY,
        currentIndex: -1,
        currentItem: null,
        itemCount: 0
    });
    assert.deepEqual(engine.advanceToNextItem(), {
        phase: QuizEnginePhase.EMPTY,
        currentIndex: -1,
        currentItem: null,
        itemCount: 0
    });
});

test("QuizEngine starts ready before the first item is selected", () => {
    const firstItem = item("First?");
    const engine = new QuizEngine([firstItem]);

    assert.deepEqual(engine.getSnapshot(), {
        phase: QuizEnginePhase.READY,
        currentIndex: -1,
        currentItem: null,
        itemCount: 1
    });
});

test("QuizEngine advances through items sequentially", () => {
    const firstItem = item("First?");
    const secondItem = item("Second?");
    const engine = new QuizEngine([firstItem, secondItem], {
        randomizeQuestions: false
    });

    assert.deepEqual(engine.advanceToNextItem(), {
        phase: QuizEnginePhase.QUESTION,
        currentIndex: 0,
        currentItem: firstItem,
        itemCount: 2
    });
    assert.deepEqual(engine.advanceToNextItem(), {
        phase: QuizEnginePhase.QUESTION,
        currentIndex: 1,
        currentItem: secondItem,
        itemCount: 2
    });
    assert.equal(engine.advanceToNextItem().currentIndex, 0);
});

test("QuizEngine snapshots can carry multiple-choice items", () => {
    const multipleChoiceItem = new QuizItem({
        type: "multipleChoice",
        question: "Pick a letter",
        answer: "C",
        choices: ["A", "B", "C", "D"]
    });
    const engine = new QuizEngine([multipleChoiceItem], {
        randomizeQuestions: false
    });

    assert.deepEqual(engine.advanceToNextItem(), {
        phase: QuizEnginePhase.QUESTION,
        currentIndex: 0,
        currentItem: multipleChoiceItem,
        itemCount: 1
    });
});

test("QuizEngine advances through randomized item indexes", () => {
    const firstItem = item("First?");
    const secondItem = item("Second?");
    const thirdItem = item("Third?");
    const randomValues = [0.7, 0.2];
    const engine = new QuizEngine([firstItem, secondItem, thirdItem], {
        random: () => randomValues.shift()
    });

    assert.deepEqual(engine.advanceToNextItem(), {
        phase: QuizEnginePhase.QUESTION,
        currentIndex: 2,
        currentItem: thirdItem,
        itemCount: 3
    });
    assert.deepEqual(engine.advanceToNextItem(), {
        phase: QuizEnginePhase.QUESTION,
        currentIndex: 0,
        currentItem: firstItem,
        itemCount: 3
    });
});

test("QuizEngine avoids immediate repeats when randomized", () => {
    const firstItem = item("First?");
    const secondItem = item("Second?");
    const randomValues = [0.1, 0.1];
    const engine = new QuizEngine([firstItem, secondItem], {
        random: () => randomValues.shift()
    });

    assert.equal(engine.advanceToNextItem().currentIndex, 0);
    assert.equal(engine.advanceToNextItem().currentIndex, 1);
});

test("QuizEngine can allow immediate repeats when configured", () => {
    const firstItem = item("First?");
    const secondItem = item("Second?");
    const engine = new QuizEngine([firstItem, secondItem], {
        avoidImmediateRepeats: false,
        random: () => 0.1
    });

    assert.equal(engine.advanceToNextItem().currentIndex, 0);
    assert.equal(engine.advanceToNextItem().currentIndex, 0);
});

test("QuizEngine snapshots are immutable", () => {
    const engine = new QuizEngine([item("First?")]);
    const snapshot = engine.advanceToNextItem();

    assert.throws(
        () => {
            snapshot.currentIndex = 99;
        },
        /Cannot assign to read only property/
    );
});

test("QuizEngine rejects non-array item collections", () => {
    assert.throws(
        () => new QuizEngine(null),
        /QuizEngine requires an array of quiz items\./
    );
});
