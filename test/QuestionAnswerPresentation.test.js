import assert from "node:assert/strict";
import test from "node:test";

import { QuestionAnswerPresentation } from "../src/adapter/QuestionAnswerPresentation.js";
import { QuizItem } from "../src/model/QuizItem.js";

function createFakeDocument() {
    return {
        createElement() {
            return {
                className: "",
                textContent: "",
                attributes: {},
                classList: {
                    classes: new Set(),
                    add(...names) {
                        names.forEach((name) => this.classes.add(name));
                    }
                },
                setAttribute(name, value) {
                    this.attributes[name] = value;
                }
            };
        }
    };
}

function oneAnswerItem() {
    return new QuizItem({
        type: "oneAnswer",
        question: "Capital of France?",
        answer: "Paris"
    });
}

test("QuestionAnswerPresentation hides the answer behind an accessible placeholder before the answer phase", () => {
    const strategy = new QuestionAnswerPresentation();
    const document = createFakeDocument();

    const content = strategy.buildContent(document, {
        phase: "question",
        item: oneAnswerItem(),
        eliminatedChoiceIndexes: new Set()
    });

    assert.equal(content.className, "nanoquiz-answer");
    assert.ok(content.classList.classes.has("nanoquiz-answer-placeholder"));
    assert.equal(content.attributes["aria-hidden"], "true");
    assert.equal(content.textContent, " ");
});

test("QuestionAnswerPresentation reveals the answer text during the answer phase", () => {
    const strategy = new QuestionAnswerPresentation();
    const document = createFakeDocument();

    const content = strategy.buildContent(document, {
        phase: "answer",
        item: oneAnswerItem(),
        eliminatedChoiceIndexes: new Set()
    });

    assert.ok(content.classList.classes.has("nanoquiz-answer-visible"));
    assert.ok(content.classList.classes.has("bright"));
    assert.equal(content.textContent, "Paris");
});
