import { validateNanoQuizItems } from "./validateNanoQuizItems.js";
import { loadNanoQuizItems } from "./loadNanoQuizItems.js";
import { createQuizEngine } from "./createQuizEngine.js";
import { presentationStrategyFor } from "./presentationStrategyFor.js";

globalThis.NanoQuizAdapter = Object.freeze({
    createQuizEngine,
    loadNanoQuizItems,
    validateNanoQuizItems,
    presentationStrategyFor
});
