import { QuizSource } from "./QuizSource.js";
import { cloneRawValue } from "./cloneRawValue.js";

export class MemorySource extends QuizSource {
    #rawItems;

    constructor(rawItems, { id = "memory" } = {}) {
        super({ id });
        // Keep source-owned raw data isolated from caller mutations.
        this.#rawItems = cloneRawValue(rawItems);

        Object.freeze(this);
    }

    async loadRawItems() {
        return cloneRawValue(this.#rawItems);
    }
}
