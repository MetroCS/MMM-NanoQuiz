import { QuizItem } from "../model/QuizItem.js";
import { ValidationResult } from "./ValidationResult.js";

export class QuizValidator {
    validate(rawItems) {
        const items = rawItems.map((rawItem) =>
            new QuizItem({
                type: "oneAnswer",
                question: rawItem.question,
                answer: rawItem.answer,
                category: rawItem.category,
                explanation: rawItem.explanation
            })
        );

        return new ValidationResult({ items });
    }
}
