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
        this.engine = null;
        this.currentItem = null;
        this.currentIndex = -1;
        this.phase = "loading";
        this.eliminatedIndexes = new Set();
        this.reloadTimer = null;
        this.errorMessage = null;
        this.nextRequestId = 1;
        this.pendingTextRequests = new Map();
        this.loadItems();
    },

    suspend() {
        if (this.engine) {
            this.engine.pause();
        }
        if (this.reloadTimer) {
            clearInterval(this.reloadTimer);
            this.reloadTimer = null;
        }
    },

    resume() {
        if (this.engine) {
            this.engine.resume();
        }
        if (this.config.dataUrl && !this.reloadTimer) {
            this.startReloadTimer();
        }
    },

    notificationReceived(notification) {
        if (notification === "NANOQUIZ_NEXT") {
            if (this.engine) {
                this.engine.skipToNext();
            }
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
        if (this.engine) {
            this.engine.pause();
        }
        this.engine = null;
        this.currentItem = null;
        this.currentIndex = -1;
        this.eliminatedIndexes = new Set();
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
            this.engine = this.createEngine(validItems);
            this.engine.start({
                onChange: (snapshot) => this.applySnapshot(snapshot)
            });

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
            config: this.resolvedSourceConfig(),
            resolveFile: (file) => this.file(file),
            requestText: (source) => this.requestText(source),
            logger: {
                warn: (message) => Log.warn(`${this.name}: ${message}`)
            }
        });
    },

    resolvedSourceConfig() {
        const usesDefaultDataFile = this.config.dataFile === this.defaults.dataFile;

        if (this.config.dataUrl && usesDefaultDataFile) {
            return {
                ...this.config,
                dataFile: null
            };
        }

        return this.config;
    },

    createEngine(items) {
        if (
            typeof NanoQuizAdapter === "undefined" ||
            typeof NanoQuizAdapter.createQuizEngine !== "function"
        ) {
            throw new Error("NanoQuiz adapter bridge was not loaded.");
        }

        return NanoQuizAdapter.createQuizEngine(items, {
            avoidImmediateRepeats: this.config.avoidImmediateRepeats,
            randomizeChoices: this.config.randomizeChoices,
            randomizeQuestions: this.config.randomizeQuestions,
            timing: this.config.timing
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

    applySnapshot(snapshot) {
        if (!snapshot.currentItem) {
            return;
        }

        this.currentIndex = snapshot.currentIndex;
        this.currentItem = snapshot.currentItem;
        this.eliminatedIndexes = new Set(snapshot.eliminatedChoiceIndexes);
        this.phase = snapshot.phase;
        this.updateDom(this.config.animationSpeed);
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

        wrapper.appendChild(this.buildContentDom());

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

    buildContentDom() {
        if (
            typeof NanoQuizAdapter === "undefined" ||
            typeof NanoQuizAdapter.presentationStrategyFor !== "function"
        ) {
            throw new Error("NanoQuiz adapter bridge was not loaded.");
        }

        const strategy = NanoQuizAdapter.presentationStrategyFor(this.currentItem);

        return strategy.buildContent(document, {
            phase: this.phase,
            item: this.currentItem,
            eliminatedChoiceIndexes: this.eliminatedIndexes
        });
    }
});
