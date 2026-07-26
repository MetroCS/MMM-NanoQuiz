import { PresentationStrategy } from "./PresentationStrategy.js";

export class QuestionAnswerPresentation extends PresentationStrategy {
    buildContent(document, { phase, item }) {
        const answer = document.createElement("div");
        answer.className = "nanoquiz-answer";

        if (phase === "answer") {
            answer.classList.add("nanoquiz-answer-visible", "bright");
            answer.textContent = item.answer;
        } else {
            answer.classList.add("nanoquiz-answer-placeholder");
            answer.setAttribute("aria-hidden", "true");
            answer.textContent = " ";
        }

        return answer;
    }
}
