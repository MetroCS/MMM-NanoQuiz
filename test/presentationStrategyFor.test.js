import assert from "node:assert/strict";
import test from "node:test";

import { presentationStrategyFor } from "../src/adapter/presentationStrategyFor.js";
import { MultipleChoicePresentation } from "../src/adapter/MultipleChoicePresentation.js";
import { QuestionAnswerPresentation } from "../src/adapter/QuestionAnswerPresentation.js";

test("presentationStrategyFor selects the multiple-choice strategy for multiple-choice items", () => {
    assert.ok(presentationStrategyFor({ type: "multipleChoice" }) instanceof MultipleChoicePresentation);
});

test("presentationStrategyFor selects the question/answer strategy for other item types", () => {
    assert.ok(presentationStrategyFor({ type: "oneAnswer" }) instanceof QuestionAnswerPresentation);
});

test("presentationStrategyFor selects the question/answer strategy when there is no current item", () => {
    assert.ok(presentationStrategyFor(undefined) instanceof QuestionAnswerPresentation);
});
