import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_MODULE_NAME = "MMM-NanoQuiz";

// Standard MagicMirror module layout is MagicMirror/modules/<name>/, so the
// module's own config lives two directories above wherever `npm run preview`
// is invoked from (the module's package root).
const defaultConfigPath = () => resolve(process.cwd(), "..", "..", "config", "config.js");

const defaultFileExists = async (path) => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
};

const defaultImportConfigModule = (path) => import(pathToFileURL(resolve(path)).href);

// Loads QuizEngine options (timing, randomizeQuestions, randomizeChoices,
// avoidImmediateRepeats) from an external source, so a preview can match a
// quiz author's real configured pacing instead of always using QuizEngine's
// built-in defaults.
//
// - configSourcePath ending in ".json": the file's contents are the config
//   object directly (the same shape as a module entry's "config: { ... }"
//   value in config.js, without the wrapping module/position/config keys).
// - Any other explicit configSourcePath: treated as a real MagicMirror
//   config.js. It is imported and searched for a "MMM-NanoQuiz" module
//   entry, whose "config" is extracted.
// - No configSourcePath: the same config.js extraction is attempted against
//   the standard install layout's default location. Since nothing was
//   explicitly requested, any failure (file missing, import failure, no
//   matching module) falls back to {} (no overrides) rather than erroring.
//
// An explicitly given configSourcePath that fails is a real error, the same
// way an unreadable quiz file is, since the caller asked for it specifically.
export async function loadPreviewEngineOptions(configSourcePath, {
    moduleName = DEFAULT_MODULE_NAME,
    defaultConfigPath: defaultPath = defaultConfigPath(),
    readJsonFile = (path) => readFile(path, "utf8"),
    importConfigModule = defaultImportConfigModule,
    fileExists = defaultFileExists,
    writeErrorLine = () => {}
} = {}) {
    if (configSourcePath) {
        if (configSourcePath.endsWith(".json")) {
            return readJsonConfigSource(configSourcePath, readJsonFile);
        }

        return readModuleConfigFromFile(configSourcePath, moduleName, importConfigModule, writeErrorLine, {
            required: true
        });
    }

    if (!(await fileExists(defaultPath))) {
        return {};
    }

    return readModuleConfigFromFile(defaultPath, moduleName, importConfigModule, writeErrorLine, {
        required: false
    });
}

async function readJsonConfigSource(path, readJsonFile) {
    let text;

    try {
        text = await readJsonFile(path);
    } catch (error) {
        throw new Error(`Unable to read ${path}: ${error.message}`);
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`Unable to parse ${path} as JSON: ${error.message}`);
    }
}

async function readModuleConfigFromFile(path, moduleName, importConfigModule, writeErrorLine, { required }) {
    let magicMirrorConfig;

    try {
        const imported = await importConfigModule(path);
        magicMirrorConfig = imported.default ?? imported;
    } catch (error) {
        if (required) {
            throw new Error(`Unable to load ${path}: ${error.message}`);
        }

        return {};
    }

    const modules = Array.isArray(magicMirrorConfig.modules) ? magicMirrorConfig.modules : [];
    const matches = modules.filter((entry) => entry && entry.module === moduleName);

    if (matches.length === 0) {
        if (required) {
            throw new Error(`No "${moduleName}" module entry found in ${path}.`);
        }

        return {};
    }

    if (matches.length > 1) {
        writeErrorLine(`Multiple "${moduleName}" module entries found in ${path}; using the first one.`);
    }

    return matches[0].config ?? {};
}
