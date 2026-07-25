import NodeHelper from "../../js/node_helper.js";

const Helper = NodeHelper.create({
    async socketNotificationReceived(notification, payload) {
        if (notification !== "NANOQUIZ_REQUEST_TEXT") {
            return;
        }

        const { requestId, source } = payload;

        try {
            const response = await fetch(source, { cache: "no-store" });
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
        }
    }
});

export { Helper as "module.exports" };
