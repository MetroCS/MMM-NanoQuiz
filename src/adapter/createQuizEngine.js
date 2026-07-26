import { QuizEngine } from "../engine/QuizEngine.js";

export function createQuizEngine(items, {
    randomizeQuestions = true,
    randomizeChoices = false,
    avoidImmediateRepeats = true,
    random = Math.random,
    timing
} = {}) {
    return new QuizEngine(items, {
        avoidImmediateRepeats,
        random,
        randomizeChoices,
        randomizeQuestions,
        timing
    });
}
