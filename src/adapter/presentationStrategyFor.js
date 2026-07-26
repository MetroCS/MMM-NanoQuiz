import { QuestionAnswerPresentation } from "./QuestionAnswerPresentation.js";
import { MultipleChoicePresentation } from "./MultipleChoicePresentation.js";

const questionAnswerStrategy = new QuestionAnswerPresentation();
const multipleChoiceStrategy = new MultipleChoicePresentation();

export function presentationStrategyFor(item) {
    return item?.type === "multipleChoice" ? multipleChoiceStrategy : questionAnswerStrategy;
}
