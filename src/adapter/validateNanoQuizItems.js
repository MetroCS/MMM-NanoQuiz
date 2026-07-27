import { QuizValidator } from "../validation/QuizValidator.js";
import { formatDiagnostic } from "../validation/formatDiagnostic.js";

export function validateNanoQuizItems(rawItems, { source, logger }) {
    const result = new QuizValidator().validate(rawItems, { source });

    result.diagnostics.forEach((diagnostic) => {
        logger.warn(formatDiagnostic(diagnostic));
    });

    return result.items;
}
