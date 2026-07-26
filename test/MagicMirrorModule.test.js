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
