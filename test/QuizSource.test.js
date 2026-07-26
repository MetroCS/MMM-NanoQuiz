import assert from "node:assert/strict";
import test from "node:test";

import { QuizSource } from "../src/source/QuizSource.js";

test("QuizSource stores a source id", () => {
    assert.equal(new QuizSource({ id: "source-id" }).id, "source-id");
});

test("QuizSource requires implementations to load raw items", async () => {
    const source = new QuizSource({ id: "source-id" });

    await assert.rejects(
        () => source.loadRawItems(),
        /QuizSource implementations must load raw quiz items\./
    );
});
