export class QuizItem {
    constructor({
        type,
        question,
        answer,
        choices = [],
        category = "",
        explanation = ""
    }) {
        this.type = type;
        this.question = question;
        this.answer = answer;
        this.choices = Object.freeze([...choices]);
        this.category = category;
        this.explanation = explanation;

        Object.freeze(this);
    }
}
