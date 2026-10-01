import { describe, expect, it } from "vitest";
import {
  derivePersistentDataLifecycleEvidence,
} from "../../../src/domains/persistence/persistent-data-lifecycle.js";

describe("persistent data lifecycle evidence", () => {
  it("flags append/writeback without a visible clear as growth risk evidence", () => {
    const result = derivePersistentDataLifecycleEvidence(
      `
        const history = JSON.parse(
          world.getDynamicProperty("matchHistory") ?? "[]"
        );
        history.push({ score: 10 });
        world.setDynamicProperty("matchHistory", JSON.stringify(history));
      `,
      { artifactId: "artifact:test", relativePath: "scripts/main.ts" },
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        propertyKey: "matchHistory",
        appends: 1,
        writes: 1,
        growth: "append-without-clear",
      }),
    );
  });
});
