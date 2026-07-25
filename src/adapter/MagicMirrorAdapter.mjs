import { validateNanoQuizItems } from "./validateNanoQuizItems.js";
import { loadNanoQuizItems } from "./loadNanoQuizItems.js";

globalThis.NanoQuizAdapter = Object.freeze({
    loadNanoQuizItems,
    validateNanoQuizItems
});
