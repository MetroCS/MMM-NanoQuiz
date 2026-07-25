export class QuizItem {
    constructor({ type, question, answer, choices = [] }) {
        this.type = type;
        this.question = question;
        this.answer = answer;
        this.choices = Object.freeze([...choices]);

        Object.freeze(this);
    }
}
