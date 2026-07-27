import { QuizEnginePhase } from "../engine/QuizEngine.js";

// The engine's snapshots don't self-describe "what just changed": entering
// the eliminating phase emits a snapshot before anything is eliminated, and
// the final elimination is folded into the same snapshot that reveals the
// answer. This formatter tracks which eliminated indexes it has already
// reported so it can turn that snapshot stream into one line per actual
// change, instead of a line per snapshot.
export function createPreviewSnapshotFormatter() {
    let reportedEliminatedIndexes = new Set();

    return function formatPreviewSnapshot({ phase, currentItem, currentIndex, itemCount, eliminatedChoiceIndexes }) {
        if (!currentItem) {
            return [];
        }

        const position = `[${currentIndex + 1}/${itemCount}]`;
        const categoryPrefix = currentItem.category ? `${currentItem.category} — ` : "";
        const lines = [];

        if (phase === QuizEnginePhase.QUESTION) {
            reportedEliminatedIndexes = new Set();
            lines.push(`${position} ${categoryPrefix}Question: ${currentItem.question}`);

            if (currentItem.type === "multipleChoice") {
                lines.push(`      Choices: ${currentItem.choices.join(", ")}`);
            }

            return lines;
        }

        if (currentItem.type === "multipleChoice") {
            eliminatedChoiceIndexes
                .filter((index) => !reportedEliminatedIndexes.has(index))
                .forEach((index) => {
                    reportedEliminatedIndexes.add(index);
                    lines.push(`${position} Eliminated: ${currentItem.choices[index]}`);
                });
        }

        if (phase === QuizEnginePhase.ANSWER) {
            lines.push(`${position} ${categoryPrefix}Answer: ${currentItem.answer}`);

            if (currentItem.explanation) {
                lines.push(`      ${currentItem.explanation}`);
            }
        }

        return lines;
    };
}
