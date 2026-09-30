import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../analyzers/scripts/src/index.js";
import {
  analyzeChunkLifecycle,
} from "../src/chunk-lifecycle-analysis.js";

describe("chunk lifecycle analysis", () => {
  it("recognizes a paired ticking-area lease with capacity check", () => {
    const script = parseScriptFile(
      "main",
      [
        "async function recover(manager, options) {",
        "  if (!manager.hasCapacity(options)) return;",
        "  await manager.createTickingArea('arena:recover', options);",
        "  manager.removeTickingArea('arena:recover');",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeChunkLifecycle([script]);

    expect(result).toMatchObject({
      pairedLeases: 1,
      acquireWithoutRelease: 0,
      capacityUncheckedLeases: 0,
    });
  });

  it("flags a concrete lease acquired without release", () => {
    const script = parseScriptFile(
      "main",
      [
        "async function recover(manager, options) {",
        "  if (!manager.hasCapacity(options)) return;",
        "  await manager.createTickingArea('arena:recover', options);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeChunkLifecycle([script]);

    expect(result.acquireWithoutRelease).toBe(1);
    expect(result.pairedLeases).toBe(0);
  });

  it("accepts a capacity check in a caller that reaches the acquire helper", () => {
    const script = parseScriptFile(
      "main",
      [
        "async function recover(manager, options) {",
        "  if (!manager.hasCapacity(options)) return;",
        "  await acquire(manager, options);",
        "}",
        "async function acquire(manager, options) {",
        "  await manager.createTickingArea('arena:recover', options);",
        "  manager.removeTickingArea('arena:recover');",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeChunkLifecycle([script]);

    expect(result.pairedLeases).toBe(1);
    expect(result.capacityUncheckedLeases).toBe(0);
  });

  it("keeps runtime-dynamic lease identity unresolved", () => {
    const script = parseScriptFile(
      "main",
      [
        "async function recover(manager, id, options) {",
        "  await manager.createTickingArea(id, options);",
        "  manager.removeTickingArea(id);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeChunkLifecycle([script]);

    expect(result.dynamicLeaseKeys).toBe(1);
    expect(result.pairedLeases).toBe(0);
  });

  it("detects shutdown-only release even when shutdown calls a cleanup helper", () => {
    const script = parseScriptFile(
      "main",
      [
        "async function recover(manager, options) {",
        "  await manager.createTickingArea('arena:recover', options);",
        "}",
        "system.beforeEvents.shutdown.subscribe(() => {",
        "  cleanup(manager);",
        "});",
        "function cleanup(manager) {",
        "  manager.removeTickingArea('arena:recover');",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeChunkLifecycle([script]);

    expect(result.shutdownOnlyCleanupRisk).toBe(1);
  });

  it("reports partial entity residency observability when only load is observed", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.entityLoad.subscribe(() => {});",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeChunkLifecycle([script]);

    expect(
      result.entityResidencyObservability,
    ).toBe("partial");
  });
});
