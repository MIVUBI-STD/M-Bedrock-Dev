import { describe, expect, it } from "vitest";
import {
  deriveScriptChunkLifecycleEvidence,
} from "../src/chunk-lifecycle-evidence.js";

describe("chunk lifecycle evidence", () => {
  it("captures lifecycle events and ticking-area methods", () => {
    const result =
      deriveScriptChunkLifecycleEvidence(
        [
          "world.afterEvents.worldLoad.subscribe(() => {});",
          "world.afterEvents.entityLoad.subscribe(() => {});",
          "world.afterEvents.entityRemove.subscribe(() => {});",
          "system.beforeEvents.shutdown.subscribe(() => {});",
          "function check(dimension, manager, options) {",
          "  dimension.isChunkLoaded({ x: 0, y: 0, z: 0 });",
          "  manager.hasCapacity(options);",
          "  manager.createTickingArea('lease-1', options);",
          "  manager.removeTickingArea('lease-1');",
          "  if (area.isFullyLoaded) return;",
          "}",
        ].join("\n"),
        {
          artifactId: "fixture",
          relativePath: "scripts/main.ts",
        },
      );

    expect(
      result.map((item) => item.kind),
    ).toEqual(
      expect.arrayContaining([
        "world-load-subscription",
        "entity-load-subscription",
        "entity-remove-subscription",
        "shutdown-subscription",
        "chunk-readiness-probe",
        "ticking-area-acquire",
        "ticking-area-release",
        "ticking-area-capacity-check",
        "ticking-area-readiness-state",
      ]),
    );
  });
});
