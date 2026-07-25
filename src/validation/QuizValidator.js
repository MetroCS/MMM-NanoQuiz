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

            const question = this.normalizeString(rawItem.question);
            const answer = this.normalizeString(rawItem.answer);
            const hasValidQuestion = question.length > 0;
            const hasValidAnswer = answer.length > 0;

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
                question,
                answer,
                category: this.normalizeString(rawItem.category),
                explanation: this.normalizeString(rawItem.explanation)
            }));
        });

        return new ValidationResult({ items, diagnostics });
    }

    normalizeString(value) {
        return typeof value === "string" ? value.trim() : "";
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
