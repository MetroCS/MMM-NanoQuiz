import { QuizSource } from "./QuizSource.js";

export class MemorySource extends QuizSource {
    constructor(rawItems, { id = "memory" } = {}) {
        super({ id });
        // Keep source-owned raw data isolated from caller mutations.
        this.rawItems = cloneRawValue(rawItems);

        Object.freeze(this.rawItems);
        Object.freeze(this);
    }

    async loadRawItems() {
        return cloneRawValue(this.rawItems);
    }
}

function cloneRawValue(value) {
    if (Array.isArray(value)) {
        return value.map((item) => cloneRawValue(item));
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, entryValue]) => [key, cloneRawValue(entryValue)])
        );
    }

    return value;
}
