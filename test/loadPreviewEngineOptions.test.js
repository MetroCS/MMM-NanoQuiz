import assert from "node:assert/strict";
import test from "node:test";

import { loadPreviewEngineOptions } from "../src/cli/loadPreviewEngineOptions.js";

const sampleConfig = {
    timing: {
        oneAnswer: { questionDuration: 10000, answerDuration: 10000 },
        multipleChoice: { questionDuration: 9000, eliminationInterval: 3000, answerDuration: 10000 }
    },
    randomizeChoices: true
};

test("with no config source and no default file present, returns no overrides", async () => {
    const options = await loadPreviewEngineOptions(undefined, {
        defaultConfigPath: "/nonexistent/config.js",
        fileExists: async () => false
    });

    assert.deepEqual(options, {});
});

test("with no config source and a default file present, extracts the matching module's config", async () => {
    let importedPath = null;

    const options = await loadPreviewEngineOptions(undefined, {
        defaultConfigPath: "/nonexistent/config.js",
        fileExists: async () => true,
        importConfigModule: async (path) => {
            importedPath = path;
            return {
                default: {
                    modules: [
                        { module: "clock" },
                        { module: "MMM-NanoQuiz", config: sampleConfig }
                    ]
                }
            };
        }
    });

    assert.equal(importedPath, "/nonexistent/config.js");
    assert.deepEqual(options, sampleConfig);
});

test("with no config source, silently falls back to no overrides when the default file has no matching module", async () => {
    const options = await loadPreviewEngineOptions(undefined, {
        defaultConfigPath: "/nonexistent/config.js",
        fileExists: async () => true,
        importConfigModule: async () => ({ default: { modules: [{ module: "clock" }] } })
    });

    assert.deepEqual(options, {});
});

test("with no config source, silently falls back to no overrides when the default file's modules is missing or not an array", async () => {
    const options = await loadPreviewEngineOptions(undefined, {
        defaultConfigPath: "/nonexistent/config.js",
        fileExists: async () => true,
        importConfigModule: async () => ({ default: { modules: "not an array" } })
    });

    assert.deepEqual(options, {});
});

test("tolerates null/non-object entries in modules without crashing", async () => {
    const options = await loadPreviewEngineOptions(undefined, {
        defaultConfigPath: "/nonexistent/config.js",
        fileExists: async () => true,
        importConfigModule: async () => ({
            default: { modules: [null, undefined, "not an object", { module: "MMM-NanoQuiz", config: sampleConfig }] }
        })
    });

    assert.deepEqual(options, sampleConfig);
});

test("an explicit config.js whose modules is missing or not an array raises the clear no-match error, not a crash", async () => {
    await assert.rejects(
        () => loadPreviewEngineOptions("config.js", {
            importConfigModule: async () => ({ default: { modules: null } })
        }),
        /No "MMM-NanoQuiz" module entry found in config\.js/
    );
});

test("with no config source, silently falls back to no overrides when the default file fails to import", async () => {
    const options = await loadPreviewEngineOptions(undefined, {
        defaultConfigPath: "/nonexistent/config.js",
        fileExists: async () => true,
        importConfigModule: async () => {
            throw new Error("boom");
        }
    });

    assert.deepEqual(options, {});
});

test("a .json config source is parsed and returned directly as the config object", async () => {
    const options = await loadPreviewEngineOptions("timing.json", {
        readJsonFile: async (path) => {
            assert.equal(path, "timing.json");
            return JSON.stringify(sampleConfig);
        }
    });

    assert.deepEqual(options, sampleConfig);
});

test("a .json config source that can't be read raises a clear error", async () => {
    await assert.rejects(
        () => loadPreviewEngineOptions("missing.json", {
            readJsonFile: async () => {
                throw new Error("ENOENT");
            }
        }),
        /Unable to read missing\.json: ENOENT/
    );
});

test("a .json config source that isn't valid JSON raises a clear error", async () => {
    await assert.rejects(
        () => loadPreviewEngineOptions("timing.json", {
            readJsonFile: async () => "not json"
        }),
        /Unable to parse timing\.json as JSON/
    );
});

test("an explicit non-.json config source is treated as a MagicMirror config.js and extracted", async () => {
    const options = await loadPreviewEngineOptions("config.js", {
        importConfigModule: async (path) => {
            assert.equal(path, "config.js");
            return {
                default: {
                    modules: [{ module: "MMM-NanoQuiz", config: sampleConfig }]
                }
            };
        }
    });

    assert.deepEqual(options, sampleConfig);
});

test("an explicit config.js that fails to import raises a clear error", async () => {
    await assert.rejects(
        () => loadPreviewEngineOptions("config.js", {
            importConfigModule: async () => {
                throw new Error("boom");
            }
        }),
        /Unable to load config\.js: boom/
    );
});

test("an explicit config.js with no matching module entry raises a clear error", async () => {
    await assert.rejects(
        () => loadPreviewEngineOptions("config.js", {
            importConfigModule: async () => ({ default: { modules: [{ module: "clock" }] } })
        }),
        /No "MMM-NanoQuiz" module entry found in config\.js/
    );
});

test("an explicit config.js with multiple matching module entries uses the first and warns", async () => {
    const errorLines = [];

    const options = await loadPreviewEngineOptions("config.js", {
        importConfigModule: async () => ({
            default: {
                modules: [
                    { module: "MMM-NanoQuiz", config: { randomizeChoices: true } },
                    { module: "MMM-NanoQuiz", config: { randomizeChoices: false } }
                ]
            }
        }),
        writeErrorLine: (line) => errorLines.push(line)
    });

    assert.deepEqual(options, { randomizeChoices: true });
    assert.deepEqual(errorLines, [
        'Multiple "MMM-NanoQuiz" module entries found in config.js; using the first one.'
    ]);
});

test("a matching module entry with no config key returns no overrides", async () => {
    const options = await loadPreviewEngineOptions("config.js", {
        importConfigModule: async () => ({ default: { modules: [{ module: "MMM-NanoQuiz" }] } })
    });

    assert.deepEqual(options, {});
});
