import { QuizItem } from "../model/QuizItem.js";

const DEFAULT_TIMING = Object.freeze({
    oneAnswer: Object.freeze({
        questionDuration: 12000,
        answerDuration: 7000
    }),
    multipleChoice: Object.freeze({
        questionDuration: 12000,
        eliminationInterval: 3000,
        answerDuration: 7000
    })
});

export const QuizEnginePhase = Object.freeze({
    ANSWER: "answer",
    ELIMINATING: "eliminating",
    EMPTY: "empty",
    READY: "ready",
    QUESTION: "question"
});

export class QuizEngine {
    #items;
    #random;
    #randomizeQuestions;
    #randomizeChoices;
    #avoidImmediateRepeats;
    #timing;
    #currentIndex = -1;
    #currentItem = null;
    #eliminatedChoiceIndexes = [];
    #eliminationOrder = [];
    #phase;

    constructor(items, {
        random = Math.random,
        randomizeQuestions = true,
        randomizeChoices = false,
        avoidImmediateRepeats = true,
        timing = DEFAULT_TIMING
    } = {}) {
        if (!Array.isArray(items)) {
            throw new Error("QuizEngine requires an array of quiz items.");
        }

        this.#items = [...items];
        this.#random = random;
        this.#randomizeQuestions = randomizeQuestions;
        this.#randomizeChoices = randomizeChoices;
        this.#avoidImmediateRepeats = avoidImmediateRepeats;
        this.#timing = this.#normalizeTiming(timing);
        this.#phase = this.#items.length > 0
            ? QuizEnginePhase.READY
            : QuizEnginePhase.EMPTY;
    }

    getSnapshot() {
        return Object.freeze({
            phase: this.#phase,
            currentIndex: this.#currentIndex,
            currentItem: this.#currentItem,
            eliminatedChoiceIndexes: Object.freeze([...this.#eliminatedChoiceIndexes]),
            itemCount: this.#items.length,
            nextTransitionDelay: this.#getNextTransitionDelay()
        });
    }

    advanceToNextItem() {
        if (this.#items.length === 0) {
            return this.getSnapshot();
        }

        const previousIndex = this.#currentIndex;

        if (this.#shouldRandomize()) {
            this.#currentIndex = this.#chooseRandomIndex(previousIndex);
        } else {
            this.#currentIndex = (this.#currentIndex + 1) % this.#items.length;
        }

        this.#currentItem = this.#prepareItem(this.#items[this.#currentIndex]);
        this.#phase = QuizEnginePhase.QUESTION;
        this.#eliminatedChoiceIndexes = [];
        this.#eliminationOrder = this.#buildEliminationOrder(this.#currentItem);
        return this.getSnapshot();
    }

    revealAnswer() {
        if (
            this.#phase === QuizEnginePhase.QUESTION &&
            this.#currentItem &&
            this.#currentItem.type !== "multipleChoice"
        ) {
            this.#phase = QuizEnginePhase.ANSWER;
        }

        return this.getSnapshot();
    }

    startMultipleChoiceElimination(eliminationOrder) {
        if (
            this.#phase === QuizEnginePhase.QUESTION &&
            this.#currentItem?.type === "multipleChoice"
        ) {
            this.#eliminationOrder = Array.isArray(eliminationOrder)
                ? [...eliminationOrder]
                : this.#eliminationOrder;
            this.#eliminatedChoiceIndexes = [];
            this.#phase = this.#eliminationOrder.length > 0
                ? QuizEnginePhase.ELIMINATING
                : QuizEnginePhase.ANSWER;
        }

        return this.getSnapshot();
    }

    eliminateNextChoice() {
        if (this.#phase !== QuizEnginePhase.ELIMINATING) {
            return this.getSnapshot();
        }

        const nextIndex = this.#eliminationOrder[this.#eliminatedChoiceIndexes.length];

        if (nextIndex === undefined) {
            this.#phase = QuizEnginePhase.ANSWER;
            return this.getSnapshot();
        }

        this.#eliminatedChoiceIndexes = [
            ...this.#eliminatedChoiceIndexes,
            nextIndex
        ];

        if (this.#eliminatedChoiceIndexes.length >= this.#eliminationOrder.length) {
            this.#phase = QuizEnginePhase.ANSWER;
        }

        return this.getSnapshot();
    }

    #prepareItem(item) {
        if (item.type !== "multipleChoice") {
            return item;
        }

        const choices = [...item.choices];

        if (this.#randomizeChoices) {
            this.#shuffle(choices);
        }

        return new QuizItem({
            ...item,
            choices
        });
    }

    #getNextTransitionDelay() {
        if (!this.#currentItem) {
            return null;
        }

        const timing = this.#currentItem.type === "multipleChoice"
            ? this.#timing.multipleChoice
            : this.#timing.oneAnswer;

        if (this.#phase === QuizEnginePhase.QUESTION) {
            return timing.questionDuration;
        }

        if (this.#phase === QuizEnginePhase.ELIMINATING) {
            return timing.eliminationInterval;
        }

        if (this.#phase === QuizEnginePhase.ANSWER) {
            return timing.answerDuration;
        }

        return null;
    }

    #normalizeTiming(timing) {
        return {
            oneAnswer: {
                ...DEFAULT_TIMING.oneAnswer,
                ...timing.oneAnswer
            },
            multipleChoice: {
                ...DEFAULT_TIMING.multipleChoice,
                ...timing.multipleChoice
            }
        };
    }

    #buildEliminationOrder(item) {
        if (!item || item.type !== "multipleChoice") {
            return [];
        }

        const eliminationOrder = item.choices
            .map((choice, index) => ({ choice, index }))
            .filter(({ choice }) => choice !== item.answer)
            .map(({ index }) => index);

        this.#shuffle(eliminationOrder);

        return eliminationOrder;
    }

    #shuffle(values) {
        for (let index = values.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(this.#random() * (index + 1));
            [values[index], values[randomIndex]] = [values[randomIndex], values[index]];
        }
    }

    #shouldRandomize() {
        return this.#randomizeQuestions && this.#items.length > 1;
    }

    #chooseRandomIndex(previousIndex) {
        if (this.#avoidImmediateRepeats && previousIndex >= 0) {
            const candidateCount = this.#items.length - 1;
            const candidateIndex = Math.floor(this.#random() * candidateCount);

            return candidateIndex >= previousIndex
                ? candidateIndex + 1
                : candidateIndex;
        }

        return Math.floor(this.#random() * this.#items.length);
    }
}
