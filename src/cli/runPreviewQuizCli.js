import { validateQuizFile } from "./validateQuizFile.js";
import { formatDiagnostic } from "../validation/formatDiagnostic.js";
import { createPreviewSnapshotFormatter } from "./createPreviewSnapshotFormatter.js";
import { QuizEngine } from "../engine/QuizEngine.js";

export async function runPreviewQuizCli(argv, {
    validate = validateQuizFile,
    createEngine = (items) => new QuizEngine(items),
    writeLine = () => {},
    writeErrorLine = () => {}
} = {}) {
    const filePath = argv[0];

    if (!filePath) {
        writeErrorLine("Usage: preview-quiz <path-to-quiz-file.json>");
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

    if (result.items.length === 0) {
        writeErrorLine("Cannot preview: no valid quiz items.");
        return 1;
    }

    const engine = createEngine(result.items);
    const formatSnapshot = createPreviewSnapshotFormatter();

    // The engine loops through the quiz autonomously and never completes on
    // its own, the same way it would when driving MagicMirror's on-screen
    // display. This function returns once the preview has started; the
    // process stays alive on the engine's own pending timers until the user
    // interrupts it (e.g. Ctrl+C).
    engine.start({
        onChange: (snapshot) => {
            formatSnapshot(snapshot).forEach(writeLine);
        }
    });

    return 0;
}
