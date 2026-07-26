import { PresentationStrategy } from "./PresentationStrategy.js";

export class QuestionAnswerPresentation extends PresentationStrategy {
    buildContent(document, { phase, item }) {
        const answer = document.createElement("div");
        answer.className = "nanoquiz-answer";
        // The real answer text is always rendered so its eventual height is reserved
        // from the start; only visibility toggles, so revealing it doesn't reflow
        // surrounding content.
        answer.textContent = item.answer;

        if (phase === "answer") {
            answer.classList.add("nanoquiz-answer-visible", "bright");
        } else {
            answer.classList.add("nanoquiz-answer-placeholder");
            answer.setAttribute("aria-hidden", "true");
        }

        return answer;
    }
}
