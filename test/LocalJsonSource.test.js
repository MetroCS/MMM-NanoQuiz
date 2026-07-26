import assert from "node:assert/strict";
import test from "node:test";

import { LocalJsonSource } from "../src/source/LocalJsonSource.js";

test("LocalJsonSource exposes its path as the default source id", () => {
    const source = new LocalJsonSource({
        path: "questions.json",
        readText: async () => "[]"
    });

    assert.equal(source.id, "questions.json");
});

test("LocalJsonSource accepts a custom source id", () => {
    const source = new LocalJsonSource({
        id: "local-fixture",
        path: "questions.json",
        readText: async () => "[]"
    });

    assert.equal(source.id, "local-fixture");
});

test("LocalJsonSource reads and parses raw quiz definitions", async () => {
    const reads = [];
    const source = new LocalJsonSource({
        path: "questions.json",
        async readText(path) {
            reads.push(path);
            return JSON.stringify([
                {
                    question: "Capital of France?",
                    answer: "Paris"
                }
            ]);
        }
    });

    assert.deepEqual(await source.loadRawItems(), [
        {
            question: "Capital of France?",
            answer: "Paris"
        }
    ]);
    assert.deepEqual(reads, ["questions.json"]);
});

test("LocalJsonSource does not validate or normalize parsed definitions", async () => {
    const source = new LocalJsonSource({
        path: "questions.json",
        async readText() {
            return JSON.stringify([
                {
                    question: "  Capital of France?  ",
                    answer: "",
                    category: 42
                },
                null
            ]);
        }
    });

    assert.deepEqual(await source.loadRawItems(), [
        {
            question: "  Capital of France?  ",
            answer: "",
            category: 42
        },
        null
    ]);
});

test("LocalJsonSource protects loaded raw definitions", async () => {
    const source = new LocalJsonSource({
        path: "questions.json",
        async readText() {
            return JSON.stringify([
                {
                    question: "Pick one",
                    answer: "A",
                    choices: ["A", "B", "C", "D"]
                }
            ]);
        }
    });

    const rawItems = await source.loadRawItems();
    rawItems[0].question = "Changed";
    rawItems[0].choices.push("E");

    assert.deepEqual(await source.loadRawItems(), [
        {
            question: "Pick one",
            answer: "A",
            choices: ["A", "B", "C", "D"]
        }
    ]);
});

test("LocalJsonSource reports reader failures with source context", async () => {
    const source = new LocalJsonSource({
        path: "missing.json",
        async readText() {
            throw new Error("file not found");
        }
    });

    await assert.rejects(
        () => source.loadRawItems(),
        /Unable to read quiz source missing\.json: file not found/
    );
});

test("LocalJsonSource reports invalid JSON with source context", async () => {
    const source = new LocalJsonSource({
        path: "broken.json",
        async readText() {
            return "{";
        }
    });

    await assert.rejects(
        () => source.loadRawItems(),
        /Unable to parse quiz source broken\.json as JSON:/
    );
});
