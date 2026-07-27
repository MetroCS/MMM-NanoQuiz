import { readFile } from "node:fs/promises";
import { QuizValidator } from "../validation/QuizValidator.js";

export async function validateQuizFile(filePath, {
    readTextFile = (path) => readFile(path, "utf8"),
    validator = new QuizValidator()
} = {}) {
    let text;

    try {
        text = await readTextFile(filePath);
    } catch (error) {
        throw new Error(`Unable to read ${filePath}: ${error.message}`);
    }

    let rawItems;

    try {
        rawItems = JSON.parse(text);
    } catch (error) {
        throw new Error(`Unable to parse ${filePath} as JSON: ${error.message}`);
    }

    return validator.validate(rawItems, { source: filePath });
}
