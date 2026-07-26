import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
require("../../../js/alias-resolver");

const helperModule = await import("../node_helper.js");
const Helper = helperModule["module.exports"];

test("node helper requests remote text and returns it by request id", async () => {
    const originalFetch = globalThis.fetch;
    const sentNotifications = [];

    globalThis.fetch = async (source, options) => {
        assert.equal(source, "https://example.test/questions.json");
        assert.equal(options.cache, "no-store");
        assert.ok(options.signal);

        return {
            ok: true,
            async text() {
                return "[{\"question\":\"Q?\",\"answer\":\"A\"}]";
            }
        };
    };

    try {
        const helper = new Helper();
        helper.sendSocketNotification = (notification, payload) => {
            sentNotifications.push({ notification, payload });
        };

        await helper.socketNotificationReceived("NANOQUIZ_REQUEST_TEXT", {
            requestId: 7,
            source: "https://example.test/questions.json",
            timeout: 30000
        });

        assert.deepEqual(sentNotifications, [
            {
                notification: "NANOQUIZ_TEXT_RESPONSE",
                payload: {
                    requestId: 7,
                    text: "[{\"question\":\"Q?\",\"answer\":\"A\"}]"
                }
            }
        ]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("node helper returns remote request failures by request id", async () => {
    const originalFetch = globalThis.fetch;
    const sentNotifications = [];

    globalThis.fetch = async () => ({
        ok: false,
        status: 503
    });

    try {
        const helper = new Helper();
        helper.sendSocketNotification = (notification, payload) => {
            sentNotifications.push({ notification, payload });
        };

        await helper.socketNotificationReceived("NANOQUIZ_REQUEST_TEXT", {
            requestId: 8,
            source: "https://example.test/questions.json",
            timeout: 30000
        });

        assert.deepEqual(sentNotifications, [
            {
                notification: "NANOQUIZ_TEXT_RESPONSE",
                payload: {
                    requestId: 8,
                    error: "HTTP 503"
                }
            }
        ]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("node helper aborts remote requests after the supplied timeout", async () => {
    const originalFetch = globalThis.fetch;
    const sentNotifications = [];

    globalThis.fetch = async (_source, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => {
            reject(new Error("aborted"));
        });
    });

    try {
        const helper = new Helper();
        helper.sendSocketNotification = (notification, payload) => {
            sentNotifications.push({ notification, payload });
        };

        await helper.socketNotificationReceived("NANOQUIZ_REQUEST_TEXT", {
            requestId: 9,
            source: "https://example.test/questions.json",
            timeout: 1
        });

        assert.deepEqual(sentNotifications, [
            {
                notification: "NANOQUIZ_TEXT_RESPONSE",
                payload: {
                    requestId: 9,
                    error: "aborted"
                }
            }
        ]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("node helper uses a default timeout when none is supplied", async () => {
    const originalFetch = globalThis.fetch;
    let signalWasSupplied = false;

    globalThis.fetch = async (_source, options) => {
        signalWasSupplied = Boolean(options.signal);

        return {
            ok: true,
            async text() {
                return "[]";
            }
        };
    };

    try {
        const helper = new Helper();
        helper.sendSocketNotification = () => {};

        await helper.socketNotificationReceived("NANOQUIZ_REQUEST_TEXT", {
            requestId: 10,
            source: "https://example.test/questions.json"
        });

        assert.equal(signalWasSupplied, true);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("node helper ignores malformed remote request payloads without request ids", async () => {
    const originalFetch = globalThis.fetch;
    const sentNotifications = [];
    let fetchWasCalled = false;

    globalThis.fetch = async () => {
        fetchWasCalled = true;
        return {
            ok: true,
            async text() {
                return "[]";
            }
        };
    };

    try {
        const helper = new Helper();
        helper.sendSocketNotification = (notification, payload) => {
            sentNotifications.push({ notification, payload });
        };

        await helper.socketNotificationReceived("NANOQUIZ_REQUEST_TEXT");
        await helper.socketNotificationReceived("NANOQUIZ_REQUEST_TEXT", null);
        await helper.socketNotificationReceived("NANOQUIZ_REQUEST_TEXT", {});

        assert.equal(fetchWasCalled, false);
        assert.deepEqual(sentNotifications, []);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("node helper responds when remote request payload is missing a source", async () => {
    const originalFetch = globalThis.fetch;
    const sentNotifications = [];
    let fetchWasCalled = false;

    globalThis.fetch = async () => {
        fetchWasCalled = true;
        return {
            ok: true,
            async text() {
                return "[]";
            }
        };
    };

    try {
        const helper = new Helper();
        helper.sendSocketNotification = (notification, payload) => {
            sentNotifications.push({ notification, payload });
        };

        await helper.socketNotificationReceived("NANOQUIZ_REQUEST_TEXT", {
            requestId: 11
        });

        assert.equal(fetchWasCalled, false);
        assert.deepEqual(sentNotifications, [
            {
                notification: "NANOQUIZ_TEXT_RESPONSE",
                payload: {
                    requestId: 11,
                    error: "NanoQuiz remote request requires a source."
                }
            }
        ]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
