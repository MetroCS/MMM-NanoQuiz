import assert from "node:assert/strict";
import test from "node:test";

import { MultipleChoicePresentation } from "../src/adapter/MultipleChoicePresentation.js";
import { QuizItem } from "../src/model/QuizItem.js";

function createFakeDocument() {
    return {
        createElement() {
            return {
                className: "",
                textContent: "",
                children: [],
                classList: {
                    classes: new Set(),
                    add(...names) {
                        names.forEach((name) => this.classes.add(name));
                    }
                },
                appendChild(child) {
                    this.children.push(child);
                    return child;
                }
            };
        }
    };
}

function multipleChoiceItem() {
    return new QuizItem({
        type: "multipleChoice",
        question: "Pick a letter",
        answer: "C",
        choices: ["A", "B", "C", "D"]
    });
}

test("MultipleChoicePresentation renders one element per choice", () => {
    const strategy = new MultipleChoicePresentation();
    const document = createFakeDocument();

    const content = strategy.buildContent(document, {
        phase: "question",
        item: multipleChoiceItem(),
        eliminatedChoiceIndexes: new Set()
    });

    assert.equal(content.className, "nanoquiz-choices");
    assert.equal(content.children.length, 4);
    assert.deepEqual(content.children.map((choice) => choice.textContent), ["A", "B", "C", "D"]);
});

test("MultipleChoicePresentation marks eliminated choices", () => {
    const strategy = new MultipleChoicePresentation();
    const document = createFakeDocument();

    const content = strategy.buildContent(document, {
        phase: "eliminating",
        item: multipleChoiceItem(),
        eliminatedChoiceIndexes: new Set([0, 1])
    });

    assert.ok(content.children[0].classList.classes.has("nanoquiz-choice-eliminated"));
    assert.ok(content.children[1].classList.classes.has("nanoquiz-choice-eliminated"));
    assert.ok(!content.children[2].classList.classes.has("nanoquiz-choice-eliminated"));
    assert.ok(!content.children[3].classList.classes.has("nanoquiz-choice-eliminated"));
});

test("MultipleChoicePresentation highlights the correct choice only during the answer phase", () => {
    const strategy = new MultipleChoicePresentation();
    const document = createFakeDocument();

    const questionPhaseContent = strategy.buildContent(document, {
        phase: "question",
        item: multipleChoiceItem(),
        eliminatedChoiceIndexes: new Set()
    });
    assert.ok(!questionPhaseContent.children[2].classList.classes.has("nanoquiz-choice-correct"));

    const answerPhaseContent = strategy.buildContent(document, {
        phase: "answer",
        item: multipleChoiceItem(),
        eliminatedChoiceIndexes: new Set([0, 1, 3])
    });
    assert.ok(answerPhaseContent.children[2].classList.classes.has("nanoquiz-choice-correct"));
    assert.ok(answerPhaseContent.children[2].classList.classes.has("bright"));
});
