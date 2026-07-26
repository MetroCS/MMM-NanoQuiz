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
        eliminatedChoiceIndexes: [],
        itemCount: 0
    });
    assert.deepEqual(engine.advanceToNextItem(), {
        phase: QuizEnginePhase.EMPTY,
        currentIndex: -1,
        currentItem: null,
        eliminatedChoiceIndexes: [],
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
        eliminatedChoiceIndexes: [],
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
        eliminatedChoiceIndexes: [],
        itemCount: 2
    });
    assert.deepEqual(engine.advanceToNextItem(), {
        phase: QuizEnginePhase.QUESTION,
        currentIndex: 1,
        currentItem: secondItem,
        eliminatedChoiceIndexes: [],
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
        eliminatedChoiceIndexes: [],
        itemCount: 1
    });
});

test("QuizEngine reveals one-answer items", () => {
    const firstItem = item("First?");
    const engine = new QuizEngine([firstItem], {
        randomizeQuestions: false
    });

    engine.advanceToNextItem();

    assert.deepEqual(engine.revealAnswer(), {
        phase: QuizEnginePhase.ANSWER,
        currentIndex: 0,
        currentItem: firstItem,
        eliminatedChoiceIndexes: [],
        itemCount: 1
    });
});

test("QuizEngine does not reveal answers before an item is selected", () => {
    const firstItem = item("First?");
    const engine = new QuizEngine([firstItem]);

    assert.deepEqual(engine.revealAnswer(), {
        phase: QuizEnginePhase.READY,
        currentIndex: -1,
        currentItem: null,
        eliminatedChoiceIndexes: [],
        itemCount: 1
    });
});

test("QuizEngine does not reveal multiple-choice answers directly", () => {
    const multipleChoiceItem = new QuizItem({
        type: "multipleChoice",
        question: "Pick a letter",
        answer: "C",
        choices: ["A", "B", "C", "D"]
    });
    const engine = new QuizEngine([multipleChoiceItem], {
        randomizeQuestions: false
    });

    engine.advanceToNextItem();

    assert.deepEqual(engine.revealAnswer(), {
        phase: QuizEnginePhase.QUESTION,
        currentIndex: 0,
        currentItem: multipleChoiceItem,
        eliminatedChoiceIndexes: [],
        itemCount: 1
    });
});

test("QuizEngine eliminates multiple-choice answers before revealing the answer", () => {
    const multipleChoiceItem = new QuizItem({
        type: "multipleChoice",
        question: "Pick a letter",
        answer: "C",
        choices: ["A", "B", "C", "D"]
    });
    const engine = new QuizEngine([multipleChoiceItem], {
        randomizeQuestions: false
    });

    engine.advanceToNextItem();

    assert.deepEqual(engine.startMultipleChoiceElimination([0, 1, 3]), {
        phase: QuizEnginePhase.ELIMINATING,
        currentIndex: 0,
        currentItem: multipleChoiceItem,
        eliminatedChoiceIndexes: [],
        itemCount: 1
    });
    assert.deepEqual(engine.eliminateNextChoice(), {
        phase: QuizEnginePhase.ELIMINATING,
        currentIndex: 0,
        currentItem: multipleChoiceItem,
        eliminatedChoiceIndexes: [0],
        itemCount: 1
    });
    assert.deepEqual(engine.eliminateNextChoice(), {
        phase: QuizEnginePhase.ELIMINATING,
        currentIndex: 0,
        currentItem: multipleChoiceItem,
        eliminatedChoiceIndexes: [0, 1],
        itemCount: 1
    });
    assert.deepEqual(engine.eliminateNextChoice(), {
        phase: QuizEnginePhase.ANSWER,
        currentIndex: 0,
        currentItem: multipleChoiceItem,
        eliminatedChoiceIndexes: [0, 1, 3],
        itemCount: 1
    });
});

test("QuizEngine reveals multiple-choice answers immediately without elimination choices", () => {
    const multipleChoiceItem = new QuizItem({
        type: "multipleChoice",
        question: "Pick a letter",
        answer: "C",
        choices: ["A", "B", "C", "D"]
    });
    const engine = new QuizEngine([multipleChoiceItem], {
        randomizeQuestions: false
    });

    engine.advanceToNextItem();

    assert.deepEqual(engine.startMultipleChoiceElimination(), {
        phase: QuizEnginePhase.ANSWER,
        currentIndex: 0,
        currentItem: multipleChoiceItem,
        eliminatedChoiceIndexes: [],
        itemCount: 1
    });
});

test("QuizEngine resets eliminated choices when advancing to a new item", () => {
    const multipleChoiceItem = new QuizItem({
        type: "multipleChoice",
        question: "Pick a letter",
        answer: "C",
        choices: ["A", "B", "C", "D"]
    });
    const nextItem = item("Next?");
    const engine = new QuizEngine([multipleChoiceItem, nextItem], {
        randomizeQuestions: false
    });

    engine.advanceToNextItem();
    engine.startMultipleChoiceElimination([0]);
    engine.eliminateNextChoice();

    assert.deepEqual(engine.advanceToNextItem(), {
        phase: QuizEnginePhase.QUESTION,
        currentIndex: 1,
        currentItem: nextItem,
        eliminatedChoiceIndexes: [],
        itemCount: 2
    });
});

test("QuizEngine snapshots protect eliminated choice indexes", () => {
    const multipleChoiceItem = new QuizItem({
        type: "multipleChoice",
        question: "Pick a letter",
        answer: "C",
        choices: ["A", "B", "C", "D"]
    });
    const engine = new QuizEngine([multipleChoiceItem], {
        randomizeQuestions: false
    });

    engine.advanceToNextItem();
    engine.startMultipleChoiceElimination([0]);
    const snapshot = engine.eliminateNextChoice();

    assert.ok(Object.isFrozen(snapshot.eliminatedChoiceIndexes));
    assert.throws(
        () => {
            snapshot.eliminatedChoiceIndexes.push(1);
        },
        /Cannot add property/
    );
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
        eliminatedChoiceIndexes: [],
        itemCount: 3
    });
    assert.deepEqual(engine.advanceToNextItem(), {
        phase: QuizEnginePhase.QUESTION,
        currentIndex: 0,
        currentItem: firstItem,
        eliminatedChoiceIndexes: [],
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
