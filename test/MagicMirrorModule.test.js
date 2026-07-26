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
                    randomizeChoices: false,
                    randomizeQuestions: false,
                    timing: moduleDefinition.defaults.timing
                }
            }
        ]);
    } finally {
        globalThis.NanoQuizAdapter = originalAdapter;
    }
});

test("MagicMirror module applies one-answer engine snapshots to local state", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const item = {
        question: "Question?",
        answer: "Answer",
        type: "oneAnswer"
    };
    let updated = false;
    const moduleInstance = {
        ...moduleDefinition,
        config: moduleDefinition.defaults,
        currentItem: null,
        currentIndex: -1,
        eliminatedIndexes: new Set([0]),
        updateDom() {
            updated = true;
        }
    };

    moduleInstance.applySnapshot({
        currentIndex: 2,
        currentItem: item,
        eliminatedChoiceIndexes: [],
        phase: "question"
    });

    assert.equal(moduleInstance.currentIndex, 2);
    assert.equal(moduleInstance.currentItem, item);
    assert.deepEqual([...moduleInstance.eliminatedIndexes], []);
    assert.equal(moduleInstance.phase, "question");
    assert.equal(updated, true);
});

test("MagicMirror module applies multiple-choice engine snapshots to local state", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const item = {
        question: "Pick a letter",
        answer: "C",
        type: "multipleChoice",
        choices: ["A", "B", "C", "D"]
    };
    const moduleInstance = {
        ...moduleDefinition,
        config: moduleDefinition.defaults,
        currentItem: null,
        currentIndex: -1,
        eliminatedIndexes: new Set(),
        updateDom() {}
    };

    moduleInstance.applySnapshot({
        currentIndex: 0,
        currentItem: item,
        eliminatedChoiceIndexes: [1],
        phase: "eliminating"
    });

    assert.equal(moduleInstance.currentIndex, 0);
    assert.equal(moduleInstance.currentItem, item);
    assert.deepEqual([...moduleInstance.eliminatedIndexes], [1]);
    assert.equal(moduleInstance.phase, "eliminating");
});

test("MagicMirror module ignores engine snapshots without a current item", async () => {
    const moduleDefinition = await loadModuleDefinition();
    let updated = false;
    const moduleInstance = {
        ...moduleDefinition,
        config: moduleDefinition.defaults,
        currentItem: null,
        currentIndex: -1,
        eliminatedIndexes: new Set(),
        phase: "loading",
        updateDom() {
            updated = true;
        }
    };

    moduleInstance.applySnapshot({
        currentIndex: -1,
        currentItem: null,
        eliminatedChoiceIndexes: [],
        phase: "empty"
    });

    assert.equal(moduleInstance.currentItem, null);
    assert.equal(moduleInstance.phase, "loading");
    assert.equal(updated, false);
});

test("MagicMirror module starts a freshly created engine with itself as the change listener", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const item = { question: "Question?", answer: "Answer", type: "oneAnswer" };
    const startCalls = [];
    const fakeEngine = {
        start(options) {
            startCalls.push(options);
        }
    };
    const moduleInstance = {
        ...moduleDefinition,
        config: moduleDefinition.defaults,
        currentItem: null,
        currentIndex: -1,
        eliminatedIndexes: new Set(),
        items: [],
        engine: null,
        errorMessage: null,
        phase: "loading",
        updateDom() {},
        loadConfiguredItems: async () => [item],
        createEngine() {
            return fakeEngine;
        }
    };

    await moduleInstance.loadItems();

    assert.equal(moduleInstance.engine, fakeEngine);
    assert.equal(startCalls.length, 1);
    assert.equal(typeof startCalls[0].onChange, "function");

    startCalls[0].onChange({
        currentIndex: 0,
        currentItem: item,
        eliminatedChoiceIndexes: [],
        phase: "question"
    });

    assert.equal(moduleInstance.currentItem, item);
    assert.equal(moduleInstance.phase, "question");
});

test("MagicMirror module pauses the previous engine before starting a new one on reload", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const item = { question: "Question?", answer: "Answer", type: "oneAnswer" };
    let pauseCalled = false;
    const previousEngine = {
        pause() {
            pauseCalled = true;
        }
    };
    const nextEngine = { start() {} };
    const moduleInstance = {
        ...moduleDefinition,
        config: moduleDefinition.defaults,
        currentItem: null,
        currentIndex: -1,
        eliminatedIndexes: new Set(),
        items: [],
        engine: previousEngine,
        errorMessage: null,
        phase: "question",
        updateDom() {},
        loadConfiguredItems: async () => [item],
        createEngine() {
            return nextEngine;
        }
    };

    await moduleInstance.loadItems();

    assert.equal(pauseCalled, true);
    assert.equal(moduleInstance.engine, nextEngine);
});

test("MagicMirror module reports an error and leaves no engine when loading fails", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const moduleInstance = {
        ...moduleDefinition,
        config: moduleDefinition.defaults,
        currentItem: null,
        currentIndex: -1,
        eliminatedIndexes: new Set(),
        items: [],
        engine: null,
        errorMessage: null,
        phase: "loading",
        updateDom() {},
        loadConfiguredItems: async () => {
            throw new Error("boom");
        }
    };

    await moduleInstance.loadItems();

    assert.equal(moduleInstance.phase, "error");
    assert.equal(moduleInstance.errorMessage, "boom");
    assert.equal(moduleInstance.engine, null);
});

test("MagicMirror module forwards NANOQUIZ_NEXT notifications to the engine", async () => {
    const moduleDefinition = await loadModuleDefinition();
    let skipCalled = false;
    const moduleInstance = {
        ...moduleDefinition,
        engine: {
            skipToNext() {
                skipCalled = true;
            }
        }
    };

    moduleInstance.notificationReceived("NANOQUIZ_NEXT");

    assert.equal(skipCalled, true);
});

test("MagicMirror module ignores NANOQUIZ_NEXT notifications before an engine exists", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const moduleInstance = {
        ...moduleDefinition,
        engine: null
    };

    assert.doesNotThrow(() => moduleInstance.notificationReceived("NANOQUIZ_NEXT"));
});

test("MagicMirror module pauses the engine and reload timer on suspend", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const originalClearInterval = globalThis.clearInterval;
    let pauseCalled = false;
    let clearedInterval = null;
    globalThis.clearInterval = (handle) => {
        clearedInterval = handle;
    };

    try {
        const moduleInstance = {
            ...moduleDefinition,
            engine: {
                pause() {
                    pauseCalled = true;
                }
            },
            reloadTimer: "reload-handle"
        };

        moduleInstance.suspend();

        assert.equal(pauseCalled, true);
        assert.equal(clearedInterval, "reload-handle");
        assert.equal(moduleInstance.reloadTimer, null);
    } finally {
        globalThis.clearInterval = originalClearInterval;
    }
});

test("MagicMirror module resumes the engine and restarts the reload timer", async () => {
    const moduleDefinition = await loadModuleDefinition();
    let resumeCalled = false;
    let reloadTimerStarted = false;
    const moduleInstance = {
        ...moduleDefinition,
        config: { dataUrl: "https://example.test/questions.json" },
        engine: {
            resume() {
                resumeCalled = true;
            }
        },
        reloadTimer: null,
        startReloadTimer() {
            reloadTimerStarted = true;
        }
    };

    moduleInstance.resume();

    assert.equal(resumeCalled, true);
    assert.equal(reloadTimerStarted, true);
});
