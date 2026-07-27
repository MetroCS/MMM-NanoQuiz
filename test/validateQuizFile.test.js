import assert from "node:assert/strict";
import test from "node:test";

import { validateQuizFile } from "../src/cli/validateQuizFile.js";

test("validateQuizFile validates the parsed contents of the given file", async () => {
    const result = await validateQuizFile("questions.json", {
        readTextFile: async (filePath) => {
            assert.equal(filePath, "questions.json");
            return JSON.stringify([
                { question: "Capital of France?", answer: "Paris" }
            ]);
        }
    });

    assert.equal(result.items.length, 1);
    assert.equal(result.isValid, true);
});

test("validateQuizFile reports diagnostics for invalid items without throwing", async () => {
    const result = await validateQuizFile("questions.json", {
        readTextFile: async () => JSON.stringify([
            { answer: "Paris" }
        ])
    });

    assert.equal(result.items.length, 0);
    assert.equal(result.isValid, false);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].source, "questions.json");
});

test("validateQuizFile raises a clear error when the file cannot be read", async () => {
    await assert.rejects(
        () => validateQuizFile("missing.json", {
            readTextFile: async () => {
                throw new Error("ENOENT");
            }
        }),
        /Unable to read missing\.json: ENOENT/
    );
});

test("validateQuizFile raises a clear error when the file is not valid JSON", async () => {
    await assert.rejects(
        () => validateQuizFile("questions.json", {
            readTextFile: async () => "not json"
        }),
        /Unable to parse questions\.json as JSON/
    );
});
