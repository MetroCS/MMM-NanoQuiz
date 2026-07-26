/* global Module, Log */

Module.register("MMM-NanoQuiz", {
    defaults: {
        dataFile: "questions.json",
        dataUrl: null,
        reloadInterval: 15 * 60 * 1000,
        remoteRequestTimeout: 30000,
        randomizeQuestions: true,
        randomizeChoices: false,
        avoidImmediateRepeats: true,
        showCategory: true,
        showExplanation: true,
        showProgress: false,
        animationSpeed: 600,
        eliminatedChoiceOpacity: 0.22,
        timing: {
            oneAnswer: {
                questionDuration: 12000,
                answerDuration: 7000
            },
            multipleChoice: {
                questionDuration: 12000,
                eliminationInterval: 3000,
                answerDuration: 7000
            }
        }
    },

    getStyles() {
        return ["MMM-NanoQuiz.css"];
    },

    getScripts() {
        return [this.file("src/adapter/MagicMirrorAdapter.mjs")];
    },

    start() {
        Log.info(`Starting module: ${this.name}`);
        this.items = [];
        this.currentItem = null;
        this.currentIndex = -1;
        this.phase = "loading";
        this.eliminatedIndexes = new Set();
        this.eliminationOrder = [];
        this.timer = null;
        this.reloadTimer = null;
        this.errorMessage = null;
        this.nextRequestId = 1;
        this.pendingTextRequests = new Map();
        this.loadItems();
    },

    suspend() {
        this.clearTimer();
        if (this.reloadTimer) {
            clearInterval(this.reloadTimer);
            this.reloadTimer = null;
        }
    },

    resume() {
        if (this.items.length > 0 && !this.timer) {
            this.scheduleCurrentPhase();
        }
        if (this.config.dataUrl && !this.reloadTimer) {
            this.startReloadTimer();
        }
    },

    notificationReceived(notification) {
        if (notification === "NANOQUIZ_NEXT") {
            this.advanceItem();
        } else if (notification === "NANOQUIZ_RELOAD") {
            this.loadItems();
        }
    },

    socketNotificationReceived(notification, payload) {
        if (
            notification !== "NANOQUIZ_TEXT_RESPONSE" ||
            !payload ||
            typeof payload !== "object" ||
            payload.requestId === undefined ||
            payload.requestId === null
        ) {
            return;
        }

        const pendingRequest = this.pendingTextRequests.get(payload.requestId);
        if (!pendingRequest) {
            return;
        }

        this.pendingTextRequests.delete(payload.requestId);

        if (payload.error) {
            pendingRequest.reject(new Error(payload.error));
        } else {
            pendingRequest.resolve(payload.text);
        }
    },

    async loadItems() {
        this.clearTimer();
        this.phase = "loading";
        this.errorMessage = null;
        this.updateDom(this.config.animationSpeed);

        try {
            const validItems = await this.loadConfiguredItems();

            if (validItems.length === 0) {
                throw new Error("No valid NanoQuiz items were found.");
            }

            this.items = validItems;
            this.currentIndex = -1;
            this.advanceItem();

            if (this.config.dataUrl) {
                this.startReloadTimer();
            }
        } catch (error) {
            Log.error(`${this.name}: ${error.message}`);
            this.phase = "error";
            this.errorMessage = error.message;
            this.updateDom(this.config.animationSpeed);
        }
    },

    async loadConfiguredItems() {
        if (
            typeof NanoQuizAdapter === "undefined" ||
            typeof NanoQuizAdapter.loadNanoQuizItems !== "function"
        ) {
            throw new Error("NanoQuiz adapter bridge was not loaded.");
        }

        return NanoQuizAdapter.loadNanoQuizItems({
            config: this.config,
            resolveFile: (file) => this.file(file),
            requestText: (source) => this.requestText(source),
            logger: {
                warn: (message) => Log.warn(`${this.name}: ${message}`)
            }
        });
    },

    async requestText(source) {
        if (this.isRemoteSource(source)) {
            return this.requestRemoteText(source);
        }

        const response = await fetch(source, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.text();
    },

    isRemoteSource(source) {
        return /^https?:\/\//u.test(source);
    },

    requestRemoteText(source) {
        if (typeof this.sendSocketNotification !== "function") {
            return Promise.reject(new Error("NanoQuiz helper is not available."));
        }

        const requestId = this.nextRequestId;
        this.nextRequestId += 1;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingTextRequests.delete(requestId);
                reject(new Error(`Timed out requesting ${source}`));
            }, this.config.remoteRequestTimeout);

            const pendingRequest = {
                resolve(text) {
                    clearTimeout(timeout);
                    resolve(text);
                },
                reject(error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            };

            this.pendingTextRequests.set(requestId, pendingRequest);

            try {
                this.sendSocketNotification("NANOQUIZ_REQUEST_TEXT", {
                    requestId,
                    source,
                    timeout: this.config.remoteRequestTimeout
                });
            } catch (error) {
                this.pendingTextRequests.delete(requestId);
                pendingRequest.reject(error);
            }
        });
    },

    startReloadTimer() {
        if (this.reloadTimer) {
            clearInterval(this.reloadTimer);
        }
        if (this.config.reloadInterval > 0) {
            this.reloadTimer = setInterval(() => this.loadItems(), this.config.reloadInterval);
        }
    },

    advanceItem() {
        if (this.items.length === 0) {
            return;
        }

        this.clearTimer();
        const previousIndex = this.currentIndex;

        if (this.config.randomizeQuestions && this.items.length > 1) {
            do {
                this.currentIndex = Math.floor(Math.random() * this.items.length);
            } while (this.config.avoidImmediateRepeats && this.currentIndex === previousIndex);
        } else {
            this.currentIndex = (this.currentIndex + 1) % this.items.length;
        }

        this.currentItem = this.prepareItem(this.items[this.currentIndex]);
        this.eliminatedIndexes = new Set();
        this.eliminationOrder = this.buildEliminationOrder(this.currentItem);
        this.phase = "question";
        this.updateDom(this.config.animationSpeed);
        this.scheduleCurrentPhase();
    },

    prepareItem(item) {
        const prepared = {
            ...item,
            choices: item.choices ? [...item.choices] : undefined
        };

        if (prepared.type === "multipleChoice" && this.config.randomizeChoices) {
            for (let index = prepared.choices.length - 1; index > 0; index -= 1) {
                const randomIndex = Math.floor(Math.random() * (index + 1));
                [prepared.choices[index], prepared.choices[randomIndex]] = [
                    prepared.choices[randomIndex],
                    prepared.choices[index]
                ];
            }
        }

        return prepared;
    },

    buildEliminationOrder(item) {
        if (!item || item.type !== "multipleChoice") {
            return [];
        }

        const indexes = item.choices
            .map((choice, index) => ({ choice, index }))
            .filter(({ choice }) => choice !== item.answer)
            .map(({ index }) => index);

        for (let index = indexes.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [indexes[index], indexes[randomIndex]] = [indexes[randomIndex], indexes[index]];
        }

        return indexes;
    },

    scheduleCurrentPhase() {
        this.clearTimer();
        if (!this.currentItem) {
            return;
        }

        const timing = this.currentItem.type === "multipleChoice"
            ? this.config.timing.multipleChoice
            : this.config.timing.oneAnswer;

        if (this.phase === "question") {
            this.timer = setTimeout(() => {
                if (this.currentItem.type === "multipleChoice") {
                    this.phase = "eliminating";
                    this.eliminateNextChoice();
                } else {
                    this.phase = "answer";
                    this.updateDom(this.config.animationSpeed);
                    this.scheduleCurrentPhase();
                }
            }, timing.questionDuration);
        } else if (this.phase === "eliminating") {
            this.timer = setTimeout(
                () => this.eliminateNextChoice(),
                timing.eliminationInterval
            );
        } else if (this.phase === "answer") {
            this.timer = setTimeout(() => this.advanceItem(), timing.answerDuration);
        }
    },

    eliminateNextChoice() {
        const nextIndex = this.eliminationOrder[this.eliminatedIndexes.size];

        if (nextIndex === undefined) {
            this.phase = "answer";
            this.updateDom(this.config.animationSpeed);
            this.scheduleCurrentPhase();
            return;
        }

        this.eliminatedIndexes.add(nextIndex);
        this.updateDom(this.config.animationSpeed);

        if (this.eliminatedIndexes.size >= this.eliminationOrder.length) {
            this.phase = "answer";
            this.updateDom(this.config.animationSpeed);
            this.scheduleCurrentPhase();
        } else {
            this.scheduleCurrentPhase();
        }
    },

    clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    },

    getDom() {
        const wrapper = document.createElement("div");
        wrapper.className = "nanoquiz";
        wrapper.style.setProperty(
            "--nanoquiz-eliminated-opacity",
            String(this.config.eliminatedChoiceOpacity)
        );

        if (this.phase === "loading") {
            wrapper.classList.add("nanoquiz-status", "dimmed", "light", "small");
            wrapper.textContent = "Loading NanoQuiz…";
            return wrapper;
        }

        if (this.phase === "error") {
            wrapper.classList.add("nanoquiz-status", "nanoquiz-error", "small");
            wrapper.textContent = `NanoQuiz unavailable: ${this.errorMessage}`;
            return wrapper;
        }

        if (!this.currentItem) {
            return wrapper;
        }

        if (this.config.showCategory && this.currentItem.category) {
            const category = document.createElement("div");
            category.className = "nanoquiz-category dimmed small";
            category.textContent = this.currentItem.category;
            wrapper.appendChild(category);
        }

        const question = document.createElement("div");
        question.className = "nanoquiz-question bright";
        question.textContent = this.currentItem.question;
        wrapper.appendChild(question);

        if (this.currentItem.type === "multipleChoice") {
            wrapper.appendChild(this.buildChoicesDom());
        } else {
            wrapper.appendChild(this.buildOneAnswerDom());
        }

        if (this.phase === "answer" && this.config.showExplanation && this.currentItem.explanation) {
            const explanation = document.createElement("div");
            explanation.className = "nanoquiz-explanation dimmed small";
            explanation.textContent = this.currentItem.explanation;
            wrapper.appendChild(explanation);
        }

        if (this.config.showProgress) {
            const progress = document.createElement("div");
            progress.className = "nanoquiz-progress dimmed xsmall";
            progress.textContent = `${this.currentIndex + 1} / ${this.items.length}`;
            wrapper.appendChild(progress);
        }

        return wrapper;
    },

    buildOneAnswerDom() {
        const answer = document.createElement("div");
        answer.className = "nanoquiz-answer";

        if (this.phase === "answer") {
            answer.classList.add("nanoquiz-answer-visible", "bright");
            answer.textContent = this.currentItem.answer;
        } else {
            answer.classList.add("nanoquiz-answer-placeholder");
            answer.setAttribute("aria-hidden", "true");
            answer.textContent = " ";
        }

        return answer;
    },

    buildChoicesDom() {
        const choices = document.createElement("div");
        choices.className = "nanoquiz-choices";

        this.currentItem.choices.forEach((choiceText, index) => {
            const choice = document.createElement("div");
            choice.className = "nanoquiz-choice";
            choice.textContent = choiceText;

            if (this.eliminatedIndexes.has(index)) {
                choice.classList.add("nanoquiz-choice-eliminated");
            }

            if (this.phase === "answer" && choiceText === this.currentItem.answer) {
                choice.classList.add("nanoquiz-choice-correct", "bright");
            }

            choices.appendChild(choice);
        });

        return choices;
    }
});
