import { QuizItem } from "../model/QuizItem.js";
import { Diagnostic, DiagnosticSeverity } from "./Diagnostic.js";
import { ValidationResult } from "./ValidationResult.js";

export class QuizValidator {
    validate(rawItems, { source = null } = {}) {
        const items = [];
        const diagnostics = [];

        if (!Array.isArray(rawItems)) {
            diagnostics.push(this.error({
                code: "source.notArray",
                message: "Raw quiz definitions must be an array.",
                source
            }));

            return new ValidationResult({ items, diagnostics });
        }

        rawItems.forEach((rawItem, itemIndex) => {
            if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
                diagnostics.push(this.error({
                    code: "item.notObject",
                    message: "Quiz item must be an object.",
                    source,
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
                    source,
                    itemIndex,
                    field: "question"
                }));
            }

            if (!hasValidAnswer) {
                diagnostics.push(this.error({
                    code: "item.answer.required",
                    message: "Quiz item must include a non-empty answer.",
                    source,
                    itemIndex,
                    field: "answer"
                }));
            }

            if (!hasValidQuestion || !hasValidAnswer) {
                return;
            }

            if (this.hasNonStringValue(rawItem, "category")) {
                diagnostics.push(this.warning({
                    code: "item.category.ignored",
                    message: "Quiz item category must be a string when present.",
                    source,
                    itemIndex,
                    field: "category"
                }));
            }

            if (this.hasNonStringValue(rawItem, "explanation")) {
                diagnostics.push(this.warning({
                    code: "item.explanation.ignored",
                    message: "Quiz item explanation must be a string when present.",
                    source,
                    itemIndex,
                    field: "explanation"
                }));
            }

            const baseItem = {
                question,
                answer,
                category: this.normalizeString(rawItem.category),
                explanation: this.normalizeString(rawItem.explanation)
            };

            if (rawItem.choices !== undefined) {
                const choices = this.validateChoices(rawItem.choices, {
                    diagnostics,
                    source,
                    itemIndex
                });

                if (!choices) {
                    return;
                }

                const answerMatches = choices.filter((choice) => choice === answer).length;
                if (answerMatches !== 1) {
                    diagnostics.push(this.error({
                        code: "item.answer.choiceMismatch",
                        message: "Multiple-choice answer must match exactly one choice.",
                        source,
                        itemIndex,
                        field: "answer"
                    }));

                    return;
                }

                items.push(new QuizItem({
                    ...baseItem,
                    type: "multipleChoice",
                    choices
                }));

                return;
            }

            items.push(new QuizItem({
                ...baseItem,
                type: "oneAnswer"
            }));
        });

        return new ValidationResult({ items, diagnostics });
    }

    validateChoices(rawChoices, { diagnostics, source, itemIndex }) {
        if (!Array.isArray(rawChoices) || rawChoices.length !== 4) {
            diagnostics.push(this.error({
                code: "item.choices.count",
                message: "Multiple-choice item must include exactly four choices.",
                source,
                itemIndex,
                field: "choices"
            }));

            return null;
        }

        const choices = rawChoices.map((choice) => this.normalizeString(choice));
        if (choices.some((choice) => choice.length === 0)) {
            diagnostics.push(this.error({
                code: "item.choices.required",
                message: "Multiple-choice choices must be non-empty strings.",
                source,
                itemIndex,
                field: "choices"
            }));

            return null;
        }

        return choices;
    }

    normalizeString(value) {
        return typeof value === "string" ? value.trim() : "";
    }

    hasNonStringValue(item, field) {
        return item[field] !== undefined && typeof item[field] !== "string";
    }

    error({ code, message, source = null, itemIndex = null, field = null }) {
        return new Diagnostic({
            severity: DiagnosticSeverity.ERROR,
            code,
            message,
            source,
            itemIndex,
            field
        });
    }

    warning({ code, message, source = null, itemIndex = null, field = null }) {
        return new Diagnostic({
            severity: DiagnosticSeverity.WARNING,
            code,
            message,
            source,
            itemIndex,
            field
        });
    }
}
