import { LocalJsonSource } from "../source/LocalJsonSource.js";
import { RemoteJsonSource } from "../source/RemoteJsonSource.js";
import { validateNanoQuizItems } from "./validateNanoQuizItems.js";

export async function loadNanoQuizItems({
    config,
    resolveFile,
    requestText,
    logger
}) {
    const source = createNanoQuizSource({
        config,
        resolveFile,
        requestText,
        logger
    });
    const rawItems = await source.loadRawItems();

    return validateNanoQuizItems(rawItems, {
        source: source.id,
        logger
    });
}

function createNanoQuizSource({ config, resolveFile, requestText, logger }) {
    if (config.dataUrl) {
        if (config.dataFile) {
            logger.warn("Both dataUrl and dataFile are configured; using dataUrl.");
        }

        return new RemoteJsonSource({
            url: config.dataUrl,
            requestText
        });
    }

    if (!config.dataFile) {
        throw new Error("NanoQuiz requires either dataUrl or dataFile to be configured.");
    }

    const path = resolveFile(config.dataFile);

    return new LocalJsonSource({
        path,
        readText: requestText
    });
}
