import { describe, expect, it } from "vitest";
import {
  buildReviewUiViewModel,
} from "../src/view-model.js";
import {
  reviewProjectionFixture,
} from "../src/review-projection-fixture.js";

describe("review UI model pipeline", () => {
  it("builds the UI model from the same engineering review projection contract used by the runtime loader", () => {
    const model =
      buildReviewUiViewModel(
        reviewProjectionFixture,
      );

    expect(model.artifact).toEqual({
      id: "blitz-build-v1.0.2",
      targetLabel: "Bedrock · 1.26.32",
    });
    expect(model.attentionCount).toBe(5);
    expect(model.items[0]?.state).toBe(
      "outdated-proof",
    );
    expect(
      model.items.some(
        (item) =>
          item.state === "designed-behavior" &&
          item.section === "understood",
      ),
    ).toBe(true);
  });
});
