export class QuizSource {
    constructor({ id }) {
        this.id = id;
    }

    // Implementations return raw definitions; validation is a separate framework step.
    async loadRawItems() {
        throw new Error("QuizSource implementations must load raw quiz items.");
    }
}
