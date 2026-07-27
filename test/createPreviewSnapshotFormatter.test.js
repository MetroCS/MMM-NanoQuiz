import assert from "node:assert/strict";
import test from "node:test";

import { createPreviewSnapshotFormatter } from "../src/cli/createPreviewSnapshotFormatter.js";
import { QuizItem } from "../src/model/QuizItem.js";
import { QuizEnginePhase } from "../src/engine/QuizEngine.js";

const oneAnswerItem = new QuizItem({
    type: "oneAnswer",
    question: "Why is an algorithm required to terminate?",
    answer: "Without termination, it does not produce a completed result.",
    category: "Algorithms",
    explanation: "Termination is one of the defining properties traditionally required of an algorithm."
});

const multipleChoiceItem = new QuizItem({
    type: "multipleChoice",
    question: "Which property ensures that an algorithm eventually stops?",
    answer: "Finiteness",
    choices: ["Finiteness", "Correctness", "Generality", "Efficiency"],
    category: "Algorithms",
    explanation: "Finiteness means that the algorithm completes after a finite number of steps."
});

test("formats a one-answer item's question, then its answer and explanation", () => {
    const format = createPreviewSnapshotFormatter();

    assert.deepEqual(
        format({
            phase: QuizEnginePhase.QUESTION,
            currentItem: oneAnswerItem,
            currentIndex: 0,
            itemCount: 2,
            eliminatedChoiceIndexes: []
        }),
        ["[1/2] Algorithms — Question: Why is an algorithm required to terminate?"]
    );

    assert.deepEqual(
        format({
            phase: QuizEnginePhase.ANSWER,
            currentItem: oneAnswerItem,
            currentIndex: 0,
            itemCount: 2,
            eliminatedChoiceIndexes: []
        }),
        [
            "[1/2] Algorithms — Answer: Without termination, it does not produce a completed result.",
            "      Termination is one of the defining properties traditionally required of an algorithm."
        ]
    );
});

test("omits the explanation line when there is none, and the category prefix when there is none", () => {
    const format = createPreviewSnapshotFormatter();
    const item = new QuizItem({ type: "oneAnswer", question: "What is 2 + 2?", answer: "4" });

    assert.deepEqual(
        format({
            phase: QuizEnginePhase.QUESTION,
            currentItem: item,
            currentIndex: 0,
            itemCount: 1,
            eliminatedChoiceIndexes: []
        }),
        ["[1/1] Question: What is 2 + 2?"]
    );

    assert.deepEqual(
        format({
            phase: QuizEnginePhase.ANSWER,
            currentItem: item,
            currentIndex: 0,
            itemCount: 1,
            eliminatedChoiceIndexes: []
        }),
        ["[1/1] Answer: 4"]
    );
});

test("reports the question and choices, each elimination as it happens, and the final elimination alongside the answer", () => {
    const format = createPreviewSnapshotFormatter();

    assert.deepEqual(
        format({
            phase: QuizEnginePhase.QUESTION,
            currentItem: multipleChoiceItem,
            currentIndex: 1,
            itemCount: 2,
            eliminatedChoiceIndexes: []
        }),
        [
            "[2/2] Algorithms — Question: Which property ensures that an algorithm eventually stops?",
            "      Choices: Finiteness, Correctness, Generality, Efficiency"
        ]
    );

    // The engine emits a snapshot when it enters the eliminating phase, before
    // anything has actually been eliminated yet: nothing should print for it.
    assert.deepEqual(
        format({
            phase: QuizEnginePhase.ELIMINATING,
            currentItem: multipleChoiceItem,
            currentIndex: 1,
            itemCount: 2,
            eliminatedChoiceIndexes: []
        }),
        []
    );

    assert.deepEqual(
        format({
            phase: QuizEnginePhase.ELIMINATING,
            currentItem: multipleChoiceItem,
            currentIndex: 1,
            itemCount: 2,
            eliminatedChoiceIndexes: [1]
        }),
        ["[2/2] Eliminated: Correctness"]
    );

    assert.deepEqual(
        format({
            phase: QuizEnginePhase.ELIMINATING,
            currentItem: multipleChoiceItem,
            currentIndex: 1,
            itemCount: 2,
            eliminatedChoiceIndexes: [1, 2]
        }),
        ["[2/2] Eliminated: Generality"]
    );

    // The engine folds the last elimination into the same snapshot that
    // reveals the answer (phase flips straight to "answer"); both must
    // still be reported.
    assert.deepEqual(
        format({
            phase: QuizEnginePhase.ANSWER,
            currentItem: multipleChoiceItem,
            currentIndex: 1,
            itemCount: 2,
            eliminatedChoiceIndexes: [1, 2, 3]
        }),
        [
            "[2/2] Eliminated: Efficiency",
            "[2/2] Algorithms — Answer: Finiteness",
            "      Finiteness means that the algorithm completes after a finite number of steps."
        ]
    );
});

test("resets elimination tracking between items so a repeated index isn't swallowed", () => {
    const format = createPreviewSnapshotFormatter();

    format({
        phase: QuizEnginePhase.QUESTION,
        currentItem: multipleChoiceItem,
        currentIndex: 0,
        itemCount: 2,
        eliminatedChoiceIndexes: []
    });
    format({
        phase: QuizEnginePhase.ELIMINATING,
        currentItem: multipleChoiceItem,
        currentIndex: 0,
        itemCount: 2,
        eliminatedChoiceIndexes: [1]
    });

    const otherMultipleChoiceItem = new QuizItem({
        type: "multipleChoice",
        question: "A different question",
        answer: "Correct",
        choices: ["Correct", "Wrong one", "Wrong two", "Wrong three"]
    });

    format({
        phase: QuizEnginePhase.QUESTION,
        currentItem: otherMultipleChoiceItem,
        currentIndex: 1,
        itemCount: 2,
        eliminatedChoiceIndexes: []
    });

    assert.deepEqual(
        format({
            phase: QuizEnginePhase.ELIMINATING,
            currentItem: otherMultipleChoiceItem,
            currentIndex: 1,
            itemCount: 2,
            eliminatedChoiceIndexes: [1]
        }),
        ["[2/2] Eliminated: Wrong one"]
    );
});

test("returns no lines when there is no current item", () => {
    const format = createPreviewSnapshotFormatter();

    assert.deepEqual(
        format({
            phase: QuizEnginePhase.EMPTY,
            currentItem: null,
            currentIndex: -1,
            itemCount: 0,
            eliminatedChoiceIndexes: []
        }),
        []
    );
});
