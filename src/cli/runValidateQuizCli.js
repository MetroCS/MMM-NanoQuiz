import { validateQuizFile } from "./validateQuizFile.js";
import { formatDiagnostic } from "../validation/formatDiagnostic.js";

export async function runValidateQuizCli(argv, {
    validate = validateQuizFile,
    writeLine = () => {},
    writeErrorLine = () => {}
} = {}) {
    const filePath = argv[0];

    if (!filePath) {
        writeErrorLine("Usage: validate-quiz <path-to-quiz-file.json>");
        return 1;
    }

    let result;

    try {
        result = await validate(filePath);
    } catch (error) {
        writeErrorLine(error.message);
        return 1;
    }

    result.diagnostics.forEach((diagnostic) => {
        writeLine(formatDiagnostic(diagnostic));
    });

    writeLine(
        `${result.items.length} valid item(s), ${result.errors.length} error(s), ${result.warnings.length} warning(s).`
    );

    return result.isValid ? 0 : 1;
}
