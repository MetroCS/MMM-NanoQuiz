import { QuizSource } from "./QuizSource.js";
import { cloneRawValue } from "./cloneRawValue.js";

export class LocalJsonSource extends QuizSource {
    constructor({ path, readText, id = path }) {
        super({ id });
        this.path = path;
        this.readText = readText;

        Object.freeze(this);
    }

    async loadRawItems() {
        const jsonText = await this.readSourceText();

        try {
            return cloneRawValue(JSON.parse(jsonText));
        } catch (error) {
            throw new Error(`Unable to parse quiz source ${this.id} as JSON: ${error.message}`);
        }
    }

    async readSourceText() {
        try {
            return await this.readText(this.path);
        } catch (error) {
            throw new Error(`Unable to read quiz source ${this.id}: ${error.message}`);
        }
    }
}
