import NodeHelper from "../../js/node_helper.js";

const DEFAULT_REQUEST_TIMEOUT = 30000;

const Helper = NodeHelper.create({
    async socketNotificationReceived(notification, payload) {
        if (notification !== "NANOQUIZ_REQUEST_TEXT") {
            return;
        }

        const { requestId, source, timeout } = payload;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), getRequestTimeout(timeout));

        try {
            const response = await fetch(source, {
                cache: "no-store",
                signal: controller.signal
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            this.sendSocketNotification("NANOQUIZ_TEXT_RESPONSE", {
                requestId,
                text: await response.text()
            });
        } catch (error) {
            this.sendSocketNotification("NANOQUIZ_TEXT_RESPONSE", {
                requestId,
                error: error.message
            });
        } finally {
            clearTimeout(timeoutId);
        }
    }
});

function getRequestTimeout(timeout) {
    if (Number.isFinite(timeout) && timeout > 0) {
        return timeout;
    }

    return DEFAULT_REQUEST_TIMEOUT;
}

export { Helper as "module.exports" };
