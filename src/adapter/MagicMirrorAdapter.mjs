import { validateNanoQuizItems } from "./validateNanoQuizItems.js";
import { loadNanoQuizItems } from "./loadNanoQuizItems.js";
import { createQuizEngine } from "./createQuizEngine.js";

globalThis.NanoQuizAdapter = Object.freeze({
    createQuizEngine,
    loadNanoQuizItems,
    validateNanoQuizItems
});
