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
        assert.deepEqual(options, { cache: "no-store" });

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
            source: "https://example.test/questions.json"
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
            source: "https://example.test/questions.json"
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
