import assert from "node:assert/strict";
import test from "node:test";

import { MemorySource } from "../src/source/MemorySource.js";

test("MemorySource exposes a source id", () => {
    assert.equal(new MemorySource([]).id, "memory");
    assert.equal(new MemorySource([], { id: "preview" }).id, "preview");
});

test("MemorySource asynchronously loads raw quiz definitions", async () => {
    const source = new MemorySource([
        {
            question: "Capital of France?",
            answer: "Paris"
        },
        {
            question: "Which planet is known as the Red Planet?",
            answer: "Mars",
            choices: ["Mercury", "Venus", "Earth", "Mars"]
        }
    ]);

    const rawItems = await source.loadRawItems();

    assert.deepEqual(rawItems, [
        {
            question: "Capital of France?",
            answer: "Paris"
        },
        {
            question: "Which planet is known as the Red Planet?",
            answer: "Mars",
            choices: ["Mercury", "Venus", "Earth", "Mars"]
        }
    ]);
});

test("MemorySource does not validate or normalize raw definitions", async () => {
    const source = new MemorySource([
        {
            question: "  Capital of France?  ",
            answer: "",
            category: 42
        },
        null
    ]);

    assert.deepEqual(await source.loadRawItems(), [
        {
            question: "  Capital of France?  ",
            answer: "",
            category: 42
        },
        null
    ]);
});

test("MemorySource protects caller-owned raw definitions", async () => {
    const rawItems = [
        {
            question: "Pick one",
            answer: "A",
            choices: ["A", "B", "C", "D"]
        }
    ];
    const source = new MemorySource(rawItems);

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

test("MemorySource does not expose mutable backing data", async () => {
    const source = new MemorySource([
        {
            question: "Pick one",
            answer: "A",
            choices: ["A", "B", "C", "D"]
        }
    ]);

    assert.equal(Object.hasOwn(source, "rawItems"), false);
    assert.equal(source.rawItems, undefined);
    assert.deepEqual(await source.loadRawItems(), [
        {
            question: "Pick one",
            answer: "A",
            choices: ["A", "B", "C", "D"]
        }
    ]);
});

test("MemorySource protects loaded raw definitions", async () => {
    const source = new MemorySource([
        {
            question: "Pick one",
            answer: "A",
            choices: ["A", "B", "C", "D"]
        }
    ]);

    const firstLoad = await source.loadRawItems();
    firstLoad[0].question = "Changed";
    firstLoad[0].choices.push("E");

    assert.deepEqual(await source.loadRawItems(), [
        {
            question: "Pick one",
            answer: "A",
            choices: ["A", "B", "C", "D"]
        }
    ]);
});
