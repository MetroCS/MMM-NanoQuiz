import { PresentationStrategy } from "./PresentationStrategy.js";

export class MultipleChoicePresentation extends PresentationStrategy {
    buildContent(document, { phase, item, eliminatedChoiceIndexes }) {
        const choices = document.createElement("div");
        choices.className = "nanoquiz-choices";

        item.choices.forEach((choiceText, index) => {
            const choice = document.createElement("div");
            choice.className = "nanoquiz-choice";
            choice.textContent = choiceText;

            if (eliminatedChoiceIndexes.has(index)) {
                choice.classList.add("nanoquiz-choice-eliminated");
            }

            if (phase === "answer" && choiceText === item.answer) {
                choice.classList.add("nanoquiz-choice-correct", "bright");
            }

            choices.appendChild(choice);
        });

        return choices;
    }
}
