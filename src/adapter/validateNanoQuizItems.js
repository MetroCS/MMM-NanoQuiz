import { QuizValidator } from "../validation/QuizValidator.js";

export function validateNanoQuizItems(rawItems, { source, logger }) {
    const result = new QuizValidator().validate(rawItems, { source });

    result.diagnostics.forEach((diagnostic) => {
        logger.warn(formatDiagnostic(diagnostic));
    });

    return result.items;
}

function formatDiagnostic(diagnostic) {
    const location = [
        diagnostic.source,
        diagnostic.itemIndex === null ? null : `item ${diagnostic.itemIndex + 1}`,
        diagnostic.field
    ].filter(Boolean).join(", ");
    const prefix = location ? `[${diagnostic.severity}] ${location}:` : `[${diagnostic.severity}]`;

    return `${prefix} ${diagnostic.message}`;
}
