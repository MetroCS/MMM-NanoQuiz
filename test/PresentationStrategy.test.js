import assert from "node:assert/strict";
import test from "node:test";

import { PresentationStrategy } from "../src/adapter/PresentationStrategy.js";

test("PresentationStrategy requires implementations to build presentation content", () => {
    assert.throws(
        () => new PresentationStrategy().buildContent({}, {}),
        /PresentationStrategy implementations must build presentation content\./
    );
});
