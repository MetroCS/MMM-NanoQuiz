import { QuizItem } from "../model/QuizItem.js";
import { Diagnostic, DiagnosticSeverity } from "./Diagnostic.js";
import { ValidationResult } from "./ValidationResult.js";

export class QuizValidator {
    validate(rawItems) {
        const items = [];
        const diagnostics = [];

        if (!Array.isArray(rawItems)) {
            diagnostics.push(this.error({
                code: "source.notArray",
                message: "Raw quiz definitions must be an array."
            }));

            return new ValidationResult({ items, diagnostics });
        }

        rawItems.forEach((rawItem, itemIndex) => {
            if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
                diagnostics.push(this.error({
                    code: "item.notObject",
                    message: "Quiz item must be an object.",
                    itemIndex
                }));

                return;
            }

            const hasValidQuestion = this.isNonEmptyString(rawItem.question);
            const hasValidAnswer = this.isNonEmptyString(rawItem.answer);

            if (!hasValidQuestion) {
                diagnostics.push(this.error({
                    code: "item.question.required",
                    message: "Quiz item must include a non-empty question.",
                    itemIndex,
                    field: "question"
                }));
            }

            if (!hasValidAnswer) {
                diagnostics.push(this.error({
                    code: "item.answer.required",
                    message: "Quiz item must include a non-empty answer.",
                    itemIndex,
                    field: "answer"
                }));
            }

            if (!hasValidQuestion || !hasValidAnswer) {
                return;
            }

            items.push(new QuizItem({
                type: "oneAnswer",
                question: rawItem.question,
                answer: rawItem.answer,
                category: rawItem.category,
                explanation: rawItem.explanation
            }));
        });

        return new ValidationResult({ items, diagnostics });
    }

    isNonEmptyString(value) {
        return typeof value === "string" && value.length > 0;
    }

    error({ code, message, itemIndex = null, field = null }) {
        return new Diagnostic({
            severity: DiagnosticSeverity.ERROR,
            code,
            message,
            itemIndex,
            field
        });
    }
}
