import { QuizEngine } from "../engine/QuizEngine.js";

export function createQuizEngine(items, {
    randomizeQuestions = true,
    avoidImmediateRepeats = true,
    random = Math.random
} = {}) {
    return new QuizEngine(items, {
        avoidImmediateRepeats,
        random,
        randomizeQuestions
    });
}
