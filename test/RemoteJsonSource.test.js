import assert from "node:assert/strict";
import test from "node:test";

import { RemoteJsonSource } from "../src/source/RemoteJsonSource.js";

test("RemoteJsonSource exposes its URL as the default source id", () => {
    const source = new RemoteJsonSource({
        url: "https://example.test/questions.json",
        requestText: async () => "[]"
    });

    assert.equal(source.id, "https://example.test/questions.json");
});

test("RemoteJsonSource accepts a custom source id", () => {
    const source = new RemoteJsonSource({
        id: "remote-fixture",
        url: "https://example.test/questions.json",
        requestText: async () => "[]"
    });

    assert.equal(source.id, "remote-fixture");
});

test("RemoteJsonSource requests and parses raw quiz definitions", async () => {
    const requests = [];
    const source = new RemoteJsonSource({
        url: "https://example.test/questions.json",
        async requestText(url) {
            requests.push(url);
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
    assert.deepEqual(requests, ["https://example.test/questions.json"]);
});

test("RemoteJsonSource does not validate or normalize parsed definitions", async () => {
    const source = new RemoteJsonSource({
        url: "https://example.test/questions.json",
        async requestText() {
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

test("RemoteJsonSource protects loaded raw definitions", async () => {
    const source = new RemoteJsonSource({
        url: "https://example.test/questions.json",
        async requestText() {
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

test("RemoteJsonSource reports request failures with source context", async () => {
    const source = new RemoteJsonSource({
        url: "https://example.test/missing.json",
        async requestText() {
            throw new Error("HTTP 404");
        }
    });

    await assert.rejects(
        () => source.loadRawItems(),
        /Unable to request quiz source https:\/\/example\.test\/missing\.json: HTTP 404/
    );
});

test("RemoteJsonSource reports invalid JSON with source context", async () => {
    const source = new RemoteJsonSource({
        url: "https://example.test/broken.json",
        async requestText() {
            return "{";
        }
    });

    await assert.rejects(
        () => source.loadRawItems(),
        /Unable to parse quiz source https:\/\/example\.test\/broken\.json as JSON:/
    );
});
