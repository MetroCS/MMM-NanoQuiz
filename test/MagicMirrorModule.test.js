import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

async function loadModuleDefinition() {
    let moduleDefinition;
    const source = await fs.readFile(new URL("../MMM-NanoQuiz.js", import.meta.url), "utf8");
    const loadModule = new Function("Module", "Log", source);

    loadModule({
        register(name, definition) {
            assert.equal(name, "MMM-NanoQuiz");
            moduleDefinition = definition;
        }
    }, {
        info() {},
        warn() {},
        error() {}
    });

    return moduleDefinition;
}

test("MagicMirror module cleans up pending remote request when socket send fails", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const moduleInstance = {
        ...moduleDefinition,
        config: {
            ...moduleDefinition.defaults,
            remoteRequestTimeout: 30000
        },
        nextRequestId: 1,
        pendingTextRequests: new Map(),
        sendSocketNotification() {
            throw new Error("socket unavailable");
        }
    };

    await assert.rejects(
        () => moduleInstance.requestRemoteText("https://example.test/questions.json"),
        /socket unavailable/
    );

    assert.equal(moduleInstance.pendingTextRequests.size, 0);
});

test("MagicMirror module ignores malformed text responses", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const pendingRequest = {
        resolve() {
            throw new Error("Unexpected resolve");
        },
        reject() {
            throw new Error("Unexpected reject");
        }
    };
    const moduleInstance = {
        ...moduleDefinition,
        pendingTextRequests: new Map([[1, pendingRequest]])
    };

    assert.doesNotThrow(() => {
        moduleInstance.socketNotificationReceived("NANOQUIZ_TEXT_RESPONSE");
        moduleInstance.socketNotificationReceived("NANOQUIZ_TEXT_RESPONSE", null);
        moduleInstance.socketNotificationReceived("NANOQUIZ_TEXT_RESPONSE", {});
    });

    assert.equal(moduleInstance.pendingTextRequests.size, 1);
});

test("MagicMirror module creates a quiz engine through the adapter bridge", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const engine = {};
    const items = [{ question: "Question?", answer: "Answer" }];
    const originalAdapter = globalThis.NanoQuizAdapter;
    const calls = [];

    globalThis.NanoQuizAdapter = {
        createQuizEngine(engineItems, options) {
            calls.push({ engineItems, options });
            return engine;
        }
    };

    try {
        const moduleInstance = {
            ...moduleDefinition,
            config: {
                ...moduleDefinition.defaults,
                avoidImmediateRepeats: false,
                randomizeQuestions: false
            }
        };

        assert.equal(moduleInstance.createEngine(items), engine);
        assert.deepEqual(calls, [
            {
                engineItems: items,
                options: {
                    avoidImmediateRepeats: false,
                    randomizeQuestions: false
                }
            }
        ]);
    } finally {
        globalThis.NanoQuizAdapter = originalAdapter;
    }
});

test("MagicMirror module advances items through the quiz engine snapshot", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const item = {
        question: "Question?",
        answer: "Answer",
        type: "questionAnswer"
    };
    let scheduled = false;
    let updated = false;
    const moduleInstance = {
        ...moduleDefinition,
        config: moduleDefinition.defaults,
        currentItem: null,
        currentIndex: -1,
        eliminatedIndexes: new Set([0]),
        eliminationOrder: [0],
        engine: {
            advanceToNextItem() {
                return {
                    currentIndex: 2,
                    currentItem: item
                };
            }
        },
        clearTimer() {},
        scheduleCurrentPhase() {
            scheduled = true;
        },
        updateDom() {
            updated = true;
        }
    };

    moduleInstance.advanceItem();

    assert.equal(moduleInstance.currentIndex, 2);
    assert.equal(moduleInstance.currentItem.question, item.question);
    assert.equal(moduleInstance.currentItem.answer, item.answer);
    assert.equal(moduleInstance.currentItem.type, item.type);
    assert.deepEqual([...moduleInstance.eliminatedIndexes], []);
    assert.deepEqual(moduleInstance.eliminationOrder, []);
    assert.equal(moduleInstance.phase, "question");
    assert.equal(updated, true);
    assert.equal(scheduled, true);
});

test("MagicMirror module advances multiple-choice items through the quiz engine snapshot", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const item = {
        question: "Pick a letter",
        answer: "C",
        type: "multipleChoice",
        choices: ["A", "B", "C", "D"]
    };
    const moduleInstance = {
        ...moduleDefinition,
        config: {
            ...moduleDefinition.defaults,
            randomizeChoices: false
        },
        currentItem: null,
        currentIndex: -1,
        eliminatedIndexes: new Set([0]),
        eliminationOrder: [],
        engine: {
            advanceToNextItem() {
                return {
                    currentIndex: 0,
                    currentItem: item
                };
            }
        },
        clearTimer() {},
        scheduleCurrentPhase() {},
        updateDom() {}
    };

    moduleInstance.advanceItem();

    assert.equal(moduleInstance.currentIndex, 0);
    assert.equal(moduleInstance.currentItem.question, item.question);
    assert.equal(moduleInstance.currentItem.answer, item.answer);
    assert.equal(moduleInstance.currentItem.type, item.type);
    assert.deepEqual(moduleInstance.currentItem.choices, item.choices);
    assert.notEqual(moduleInstance.currentItem.choices, item.choices);
    assert.deepEqual(moduleInstance.eliminationOrder.toSorted(), [0, 1, 3]);
    assert.deepEqual([...moduleInstance.eliminatedIndexes], []);
    assert.equal(moduleInstance.phase, "question");
});
