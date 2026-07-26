export const QuizEnginePhase = Object.freeze({
    ANSWER: "answer",
    EMPTY: "empty",
    READY: "ready",
    QUESTION: "question"
});

export class QuizEngine {
    #items;
    #random;
    #randomizeQuestions;
    #avoidImmediateRepeats;
    #currentIndex = -1;
    #phase;

    constructor(items, {
        random = Math.random,
        randomizeQuestions = true,
        avoidImmediateRepeats = true
    } = {}) {
        if (!Array.isArray(items)) {
            throw new Error("QuizEngine requires an array of quiz items.");
        }

        this.#items = [...items];
        this.#random = random;
        this.#randomizeQuestions = randomizeQuestions;
        this.#avoidImmediateRepeats = avoidImmediateRepeats;
        this.#phase = this.#items.length > 0
            ? QuizEnginePhase.READY
            : QuizEnginePhase.EMPTY;
    }

    getSnapshot() {
        return Object.freeze({
            phase: this.#phase,
            currentIndex: this.#currentIndex,
            currentItem: this.#items[this.#currentIndex] ?? null,
            itemCount: this.#items.length
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

        this.#phase = QuizEnginePhase.QUESTION;
        return this.getSnapshot();
    }

    revealAnswer() {
        const currentItem = this.#items[this.#currentIndex];

        if (
            this.#phase === QuizEnginePhase.QUESTION &&
            currentItem &&
            currentItem.type !== "multipleChoice"
        ) {
            this.#phase = QuizEnginePhase.ANSWER;
        }

        return this.getSnapshot();
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
