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

function fakeScheduler() {
    let nextHandle = 1;
    const pending = new Map();

    return {
        scheduleTimeout(callback, delay) {
            const handle = nextHandle;
            nextHandle += 1;
            pending.set(handle, { callback, delay });
            return handle;
        },
        clearTimeout(handle) {
            pending.delete(handle);
        },
        pendingCount() {
            return pending.size;
        },
        pendingDelay() {
            const [entry] = [...pending.values()].slice(-1);
            return entry ? entry.delay : null;
        },
        fireLatest() {
            const handles = [...pending.keys()];
            const handle = handles[handles.length - 1];
            const entry = pending.get(handle);
            pending.delete(handle);
            entry.callback();
        }
    };
}

test("QuizEngine starts empty when no items are available", () => {
    const engine = new QuizEngine([]);

    assert.deepEqual(engine.getSnapshot(), {
        phase: QuizEnginePhase.EMPTY,
        currentIndex: -1,
        currentItem: null,
        eliminatedChoiceIndexes: [],
        itemCount: 0,
        nextTransitionDelay: null
    });
    assert.deepEqual(engine.advanceToNextItem(), {
        phase: QuizEnginePhase.EMPTY,
        currentIndex: -1,
        currentItem: null,
        eliminatedChoiceIndexes: [],
        itemCount: 0,
        nextTransitionDelay: null
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
        itemCount: 1,
        nextTransitionDelay: null
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
        itemCount: 2,
        nextTransitionDelay: 12000
    });
    assert.deepEqual(engine.advanceToNextItem(), {
        phase: QuizEnginePhase.QUESTION,
        currentIndex: 1,
        currentItem: secondItem,
        eliminatedChoiceIndexes: [],
        itemCount: 2,
        nextTransitionDelay: 12000
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
        itemCount: 1,
        nextTransitionDelay: 12000
    });
});

test("QuizEngine can prepare randomized multiple-choice choices", () => {
    const multipleChoiceItem = new QuizItem({
        type: "multipleChoice",
        question: "Pick a letter",
        answer: "C",
        choices: ["A", "B", "C", "D"]
    });
    const randomValues = [0.1, 0.9, 0.4];
    const engine = new QuizEngine([multipleChoiceItem], {
        random: () => randomValues.shift(),
        randomizeChoices: true,
        randomizeQuestions: false
    });

    const snapshot = engine.advanceToNextItem();

    assert.deepEqual(snapshot.currentItem.choices, ["B", "D", "C", "A"]);
    assert.equal(snapshot.currentItem.answer, "C");
    assert.notEqual(snapshot.currentItem, multipleChoiceItem);
    assert.ok(Object.isFrozen(snapshot.currentItem));
    assert.ok(Object.isFrozen(snapshot.currentItem.choices));
});

test("QuizEngine preserves multiple-choice order when choices are not randomized", () => {
    const multipleChoiceItem = new QuizItem({
        type: "multipleChoice",
        question: "Pick a letter",
        answer: "C",
        choices: ["A", "B", "C", "D"]
    });
    const engine = new QuizEngine([multipleChoiceItem], {
        randomizeChoices: false,
        randomizeQuestions: false
    });

    const snapshot = engine.advanceToNextItem();

    assert.deepEqual(snapshot.currentItem.choices, ["A", "B", "C", "D"]);
    assert.notEqual(snapshot.currentItem, multipleChoiceItem);
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
        itemCount: 1,
        nextTransitionDelay: 7000
    });
});

test("QuizEngine exposes configured one-answer phase timing", () => {
    const firstItem = item("First?");
    const engine = new QuizEngine([firstItem], {
        randomizeQuestions: false,
        timing: {
            oneAnswer: {
                questionDuration: 1000,
                answerDuration: 2000
            },
            multipleChoice: {
                questionDuration: 3000,
                eliminationInterval: 4000,
                answerDuration: 5000
            }
        }
    });

    assert.equal(engine.advanceToNextItem().nextTransitionDelay, 1000);
    assert.equal(engine.revealAnswer().nextTransitionDelay, 2000);
});

test("QuizEngine exposes configured multiple-choice phase timing", () => {
    const multipleChoiceItem = new QuizItem({
        type: "multipleChoice",
        question: "Pick a letter",
        answer: "C",
        choices: ["A", "B", "C", "D"]
    });
    const engine = new QuizEngine([multipleChoiceItem], {
        randomizeQuestions: false,
        timing: {
            oneAnswer: {
                questionDuration: 1000,
                answerDuration: 2000
            },
            multipleChoice: {
                questionDuration: 3000,
                eliminationInterval: 4000,
                answerDuration: 5000
            }
        }
    });

    assert.equal(engine.advanceToNextItem().nextTransitionDelay, 3000);
    assert.equal(engine.startMultipleChoiceElimination([0]).nextTransitionDelay, 4000);
    assert.equal(engine.eliminateNextChoice().nextTransitionDelay, 5000);
});

test("QuizEngine does not reveal answers before an item is selected", () => {
    const firstItem = item("First?");
    const engine = new QuizEngine([firstItem]);

    assert.deepEqual(engine.revealAnswer(), {
        phase: QuizEnginePhase.READY,
        currentIndex: -1,
        currentItem: null,
        eliminatedChoiceIndexes: [],
        itemCount: 1,
        nextTransitionDelay: null
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
        itemCount: 1,
        nextTransitionDelay: 12000
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
        itemCount: 1,
        nextTransitionDelay: 3000
    });
    assert.deepEqual(engine.eliminateNextChoice(), {
        phase: QuizEnginePhase.ELIMINATING,
        currentIndex: 0,
        currentItem: multipleChoiceItem,
        eliminatedChoiceIndexes: [0],
        itemCount: 1,
        nextTransitionDelay: 3000
    });
    assert.deepEqual(engine.eliminateNextChoice(), {
        phase: QuizEnginePhase.ELIMINATING,
        currentIndex: 0,
        currentItem: multipleChoiceItem,
        eliminatedChoiceIndexes: [0, 1],
        itemCount: 1,
        nextTransitionDelay: 3000
    });
    assert.deepEqual(engine.eliminateNextChoice(), {
        phase: QuizEnginePhase.ANSWER,
        currentIndex: 0,
        currentItem: multipleChoiceItem,
        eliminatedChoiceIndexes: [0, 1, 3],
        itemCount: 1,
        nextTransitionDelay: 7000
    });
});

test("QuizEngine builds multiple-choice elimination order from the prepared item", () => {
    const multipleChoiceItem = new QuizItem({
        type: "multipleChoice",
        question: "Pick a letter",
        answer: "C",
        choices: ["A", "B", "C", "D"]
    });
    const randomValues = [0.1, 0.9, 0.4, 0.9, 0.1];
    const engine = new QuizEngine([multipleChoiceItem], {
        random: () => randomValues.shift(),
        randomizeChoices: true,
        randomizeQuestions: false
    });

    engine.advanceToNextItem();
    engine.startMultipleChoiceElimination();

    assert.deepEqual(engine.eliminateNextChoice().eliminatedChoiceIndexes, [1]);
    assert.deepEqual(engine.eliminateNextChoice().eliminatedChoiceIndexes, [1, 0]);
    assert.deepEqual(engine.eliminateNextChoice(), {
        phase: QuizEnginePhase.ANSWER,
        currentIndex: 0,
        currentItem: new QuizItem({
            type: "multipleChoice",
            question: "Pick a letter",
            answer: "C",
            choices: ["B", "D", "C", "A"]
        }),
        eliminatedChoiceIndexes: [1, 0, 3],
        itemCount: 1,
        nextTransitionDelay: 7000
    });
});

test("QuizEngine reveals multiple-choice answers immediately with an empty elimination override", () => {
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

    assert.deepEqual(engine.startMultipleChoiceElimination([]), {
        phase: QuizEnginePhase.ANSWER,
        currentIndex: 0,
        currentItem: multipleChoiceItem,
        eliminatedChoiceIndexes: [],
        itemCount: 1,
        nextTransitionDelay: 7000
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
        itemCount: 2,
        nextTransitionDelay: 12000
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
        itemCount: 3,
        nextTransitionDelay: 12000
    });
    assert.deepEqual(engine.advanceToNextItem(), {
        phase: QuizEnginePhase.QUESTION,
        currentIndex: 0,
        currentItem: firstItem,
        eliminatedChoiceIndexes: [],
        itemCount: 3,
        nextTransitionDelay: 12000
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

test("QuizEngine start selects the first item and arms an automatic transition", () => {
    const firstItem = item("First?");
    const secondItem = item("Second?");
    const engine = new QuizEngine([firstItem, secondItem], {
        randomizeQuestions: false
    });
    const scheduler = fakeScheduler();
    const snapshots = [];

    const started = engine.start({
        onChange: (snapshot) => snapshots.push(snapshot),
        scheduleTimeout: scheduler.scheduleTimeout,
        clearTimeout: scheduler.clearTimeout
    });

    assert.equal(started.phase, QuizEnginePhase.QUESTION);
    assert.equal(started.currentItem, firstItem);
    assert.deepEqual(snapshots, [started]);
    assert.equal(scheduler.pendingCount(), 1);
    assert.equal(scheduler.pendingDelay(), 12000);
});

test("QuizEngine start only begins autonomous progression once", () => {
    const firstItem = item("First?");
    const secondItem = item("Second?");
    const engine = new QuizEngine([firstItem, secondItem], {
        randomizeQuestions: false
    });
    const scheduler = fakeScheduler();

    engine.start({
        scheduleTimeout: scheduler.scheduleTimeout,
        clearTimeout: scheduler.clearTimeout
    });
    const second = engine.start({
        scheduleTimeout: scheduler.scheduleTimeout,
        clearTimeout: scheduler.clearTimeout
    });

    assert.equal(second.currentItem, firstItem);
    assert.equal(scheduler.pendingCount(), 1);
});

test("QuizEngine autonomously advances a one-answer item through question, answer, and the next item", () => {
    const firstItem = item("First?");
    const secondItem = item("Second?");
    const engine = new QuizEngine([firstItem, secondItem], {
        randomizeQuestions: false
    });
    const scheduler = fakeScheduler();
    const snapshots = [];

    engine.start({
        onChange: (snapshot) => snapshots.push(snapshot),
        scheduleTimeout: scheduler.scheduleTimeout,
        clearTimeout: scheduler.clearTimeout
    });

    scheduler.fireLatest();
    assert.equal(snapshots.at(-1).phase, QuizEnginePhase.ANSWER);
    assert.equal(snapshots.at(-1).currentItem, firstItem);
    assert.equal(scheduler.pendingDelay(), 7000);

    scheduler.fireLatest();
    assert.equal(snapshots.at(-1).phase, QuizEnginePhase.QUESTION);
    assert.equal(snapshots.at(-1).currentItem, secondItem);
    assert.equal(scheduler.pendingDelay(), 12000);
});

test("QuizEngine autonomously drives a multiple-choice item through elimination to the answer", () => {
    const multipleChoiceItem = new QuizItem({
        type: "multipleChoice",
        question: "Pick a letter",
        answer: "C",
        choices: ["A", "B", "C", "D"]
    });
    const engine = new QuizEngine([multipleChoiceItem], {
        randomizeQuestions: false
    });
    const scheduler = fakeScheduler();
    const snapshots = [];

    engine.start({
        onChange: (snapshot) => snapshots.push(snapshot),
        scheduleTimeout: scheduler.scheduleTimeout,
        clearTimeout: scheduler.clearTimeout
    });

    scheduler.fireLatest();
    assert.equal(snapshots.at(-1).phase, QuizEnginePhase.ELIMINATING);
    assert.equal(scheduler.pendingDelay(), 3000);

    scheduler.fireLatest();
    scheduler.fireLatest();
    scheduler.fireLatest();
    assert.equal(snapshots.at(-1).phase, QuizEnginePhase.ANSWER);
    assert.deepEqual(snapshots.at(-1).eliminatedChoiceIndexes.length, 3);
    assert.equal(scheduler.pendingDelay(), 7000);
});

test("QuizEngine pause cancels the pending automatic transition", () => {
    const engine = new QuizEngine([item("First?")]);
    const scheduler = fakeScheduler();

    engine.start({
        scheduleTimeout: scheduler.scheduleTimeout,
        clearTimeout: scheduler.clearTimeout
    });
    assert.equal(scheduler.pendingCount(), 1);

    engine.pause();

    assert.equal(scheduler.pendingCount(), 0);
});

test("QuizEngine resume re-arms the automatic transition for the current phase", () => {
    const engine = new QuizEngine([item("First?")]);
    const scheduler = fakeScheduler();
    const snapshots = [];

    engine.start({
        onChange: (snapshot) => snapshots.push(snapshot),
        scheduleTimeout: scheduler.scheduleTimeout,
        clearTimeout: scheduler.clearTimeout
    });
    engine.pause();
    snapshots.length = 0;

    const resumed = engine.resume();

    assert.equal(resumed.phase, QuizEnginePhase.QUESTION);
    assert.deepEqual(snapshots, [resumed]);
    assert.equal(scheduler.pendingCount(), 1);
    assert.equal(scheduler.pendingDelay(), 12000);
});

test("QuizEngine resume does nothing before start has been called", () => {
    const engine = new QuizEngine([item("First?")]);

    assert.deepEqual(engine.resume(), engine.getSnapshot());
});

test("QuizEngine skipToNext cancels the pending transition and advances immediately", () => {
    const firstItem = item("First?");
    const secondItem = item("Second?");
    const engine = new QuizEngine([firstItem, secondItem], {
        randomizeQuestions: false
    });
    const scheduler = fakeScheduler();
    const snapshots = [];

    engine.start({
        onChange: (snapshot) => snapshots.push(snapshot),
        scheduleTimeout: scheduler.scheduleTimeout,
        clearTimeout: scheduler.clearTimeout
    });

    const skipped = engine.skipToNext();

    assert.equal(skipped.currentItem, secondItem);
    assert.equal(snapshots.at(-1), skipped);
    assert.equal(scheduler.pendingCount(), 1);
});
