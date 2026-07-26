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

test("MagicMirror module suppresses dataFile in the resolved source config when it is only the default", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const moduleInstance = {
        ...moduleDefinition,
        config: {
            ...moduleDefinition.defaults,
            dataUrl: "https://example.test/questions.json"
        }
    };

    assert.deepEqual(moduleInstance.resolvedSourceConfig(), {
        ...moduleDefinition.defaults,
        dataUrl: "https://example.test/questions.json",
        dataFile: null
    });
});

test("MagicMirror module keeps an explicitly configured dataFile alongside dataUrl", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const moduleInstance = {
        ...moduleDefinition,
        config: {
            ...moduleDefinition.defaults,
            dataUrl: "https://example.test/questions.json",
            dataFile: "custom-questions.json"
        }
    };

    assert.deepEqual(moduleInstance.resolvedSourceConfig(), moduleInstance.config);
});

test("MagicMirror module leaves the resolved source config unchanged when dataUrl is not configured", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const moduleInstance = {
        ...moduleDefinition,
        config: moduleDefinition.defaults
    };

    assert.deepEqual(moduleInstance.resolvedSourceConfig(), moduleDefinition.defaults);
});

test("MagicMirror module loads configured items using the resolved source config", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const originalAdapter = globalThis.NanoQuizAdapter;
    const calls = [];

    globalThis.NanoQuizAdapter = {
        async loadNanoQuizItems(options) {
            calls.push(options);
            return [];
        }
    };

    try {
        const moduleInstance = {
            ...moduleDefinition,
            config: {
                ...moduleDefinition.defaults,
                dataUrl: "https://example.test/questions.json"
            }
        };

        await moduleInstance.loadConfiguredItems();

        assert.equal(calls.length, 1);
        assert.deepEqual(calls[0].config, {
            ...moduleDefinition.defaults,
            dataUrl: "https://example.test/questions.json",
            dataFile: null
        });
    } finally {
        globalThis.NanoQuizAdapter = originalAdapter;
    }
});

test("MagicMirror module builds presentation content through the adapter bridge", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const originalAdapter = globalThis.NanoQuizAdapter;
    const originalDocument = globalThis.document;
    const calls = [];
    const fakeContent = {};
    const fakeDocument = {};
    const item = { question: "Question?", answer: "Answer", type: "oneAnswer" };

    globalThis.document = fakeDocument;
    globalThis.NanoQuizAdapter = {
        presentationStrategyFor(strategyItem) {
            return {
                buildContent(document, context) {
                    calls.push({ document, item: strategyItem, context });
                    return fakeContent;
                }
            };
        }
    };

    try {
        const moduleInstance = {
            ...moduleDefinition,
            currentItem: item,
            phase: "answer",
            eliminatedIndexes: new Set([1])
        };

        assert.equal(moduleInstance.buildContentDom(), fakeContent);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].document, fakeDocument);
        assert.equal(calls[0].item, item);
        assert.deepEqual(calls[0].context, {
            phase: "answer",
            item,
            eliminatedChoiceIndexes: moduleInstance.eliminatedIndexes
        });
    } finally {
        globalThis.NanoQuizAdapter = originalAdapter;
        globalThis.document = originalDocument;
    }
});

test("MagicMirror module requires the adapter bridge to build presentation content", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const originalAdapter = globalThis.NanoQuizAdapter;
    globalThis.NanoQuizAdapter = undefined;

    try {
        const moduleInstance = {
            ...moduleDefinition,
            currentItem: { question: "Question?", answer: "Answer" },
            phase: "question",
            eliminatedIndexes: new Set()
        };

        assert.throws(
            () => moduleInstance.buildContentDom(),
            /NanoQuiz adapter bridge was not loaded\./
        );
    } finally {
        globalThis.NanoQuizAdapter = originalAdapter;
    }
});

function createFakeDomElement() {
    return {
        className: "",
        textContent: "",
        children: [],
        attributes: {},
        styleProps: {},
        style: {
            setProperty(name, value) {
                this.owner.styleProps[name] = value;
            }
        },
        classList: {
            classes: new Set(),
            add(...names) {
                names.forEach((name) => this.classes.add(name));
            }
        },
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
        appendChild(child) {
            this.children.push(child);
            return child;
        }
    };
}

function createFakeDomDocument() {
    return {
        createElement() {
            const element = createFakeDomElement();
            element.style.owner = element;
            return element;
        }
    };
}

test("MagicMirror module wires the configured explanation opacity and stops dimming it by default", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const originalAdapter = globalThis.NanoQuizAdapter;
    const originalDocument = globalThis.document;

    globalThis.document = createFakeDomDocument();
    globalThis.NanoQuizAdapter = {
        presentationStrategyFor() {
            return {
                buildContent(document) {
                    return document.createElement("div");
                }
            };
        }
    };

    try {
        const item = {
            question: "Question?",
            answer: "Answer",
            type: "oneAnswer",
            category: "",
            explanation: "Because reasons."
        };
        const moduleInstance = {
            ...moduleDefinition,
            config: { ...moduleDefinition.defaults, explanationOpacity: 0.75 },
            currentItem: item,
            currentIndex: 0,
            items: [item],
            phase: "answer",
            eliminatedIndexes: new Set(),
            errorMessage: null
        };

        const wrapper = moduleInstance.getDom();

        assert.equal(wrapper.styleProps["--nanoquiz-explanation-opacity"], "0.75");

        const explanation = wrapper.children.find(
            (child) => child.className.includes("nanoquiz-explanation")
        );
        assert.ok(explanation);
        assert.ok(!explanation.className.includes("dimmed"));
        assert.equal(explanation.textContent, "Because reasons.");
    } finally {
        globalThis.NanoQuizAdapter = originalAdapter;
        globalThis.document = originalDocument;
    }
});

test("MagicMirror module reserves space for the explanation before the answer phase", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const originalAdapter = globalThis.NanoQuizAdapter;
    const originalDocument = globalThis.document;

    globalThis.document = createFakeDomDocument();
    globalThis.NanoQuizAdapter = {
        presentationStrategyFor() {
            return {
                buildContent(document) {
                    return document.createElement("div");
                }
            };
        }
    };

    try {
        const item = {
            question: "Question?",
            answer: "Answer",
            type: "oneAnswer",
            category: "",
            explanation: "Because reasons."
        };
        const moduleInstance = {
            ...moduleDefinition,
            config: moduleDefinition.defaults,
            currentItem: item,
            currentIndex: 0,
            items: [item],
            phase: "question",
            eliminatedIndexes: new Set(),
            errorMessage: null
        };

        const wrapper = moduleInstance.getDom();

        const explanation = wrapper.children.find(
            (child) => child.className.includes("nanoquiz-explanation")
        );

        // The explanation is present (and its space reserved) even before the answer
        // phase, so revealing it later doesn't change the layout height and doesn't
        // push the question or choices around. It's just visually hidden until then.
        assert.ok(explanation);
        assert.equal(explanation.textContent, "Because reasons.");
        assert.ok(explanation.className.includes("nanoquiz-explanation-hidden"));
    } finally {
        globalThis.NanoQuizAdapter = originalAdapter;
        globalThis.document = originalDocument;
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

test("MagicMirror module fades in when a snapshot advances to a new item", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const item = { question: "Second?", answer: "Answer", type: "oneAnswer" };
    let speedUsed;
    const moduleInstance = {
        ...moduleDefinition,
        config: { ...moduleDefinition.defaults, animationSpeed: 600 },
        currentItem: { question: "First?", answer: "Answer", type: "oneAnswer" },
        currentIndex: 0,
        eliminatedIndexes: new Set(),
        updateDom(speed) {
            speedUsed = speed;
        }
    };

    moduleInstance.applySnapshot({
        currentIndex: 1,
        currentItem: item,
        eliminatedChoiceIndexes: [],
        phase: "question"
    });

    assert.equal(speedUsed, 600);
});

test("MagicMirror module updates instantly for phase changes within the same item", async () => {
    const moduleDefinition = await loadModuleDefinition();
    const item = { question: "First?", answer: "Answer", type: "oneAnswer" };
    let speedUsed;
    const moduleInstance = {
        ...moduleDefinition,
        config: { ...moduleDefinition.defaults, animationSpeed: 600 },
        currentItem: item,
        currentIndex: 0,
        eliminatedIndexes: new Set(),
        updateDom(speed) {
            speedUsed = speed;
        }
    };

    moduleInstance.applySnapshot({
        currentIndex: 0,
        currentItem: item,
        eliminatedChoiceIndexes: [],
        phase: "answer"
    });

    assert.equal(speedUsed, 0);
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
