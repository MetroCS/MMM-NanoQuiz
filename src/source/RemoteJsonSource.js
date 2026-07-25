import { QuizSource } from "./QuizSource.js";
import { cloneRawValue } from "./cloneRawValue.js";

export class RemoteJsonSource extends QuizSource {
    constructor({ url, requestText, id = url }) {
        super({ id });
        this.url = url;
        this.requestText = requestText;

        Object.freeze(this);
    }

    async loadRawItems() {
        const jsonText = await this.requestSourceText();

        try {
            return cloneRawValue(JSON.parse(jsonText));
        } catch (error) {
            throw new Error(`Unable to parse quiz source ${this.id} as JSON: ${error.message}`);
        }
    }

    async requestSourceText() {
        try {
            return await this.requestText(this.url);
        } catch (error) {
            throw new Error(`Unable to request quiz source ${this.id}: ${error.message}`);
        }
    }
}
