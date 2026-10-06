import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import {
  analyzeChunkLifecycle,
} from "../../src/inspection/chunk-lifecycle-analysis.js";

describe("chunk lifecycle analysis", () => {
  it("recognizes a paired ticking-area lease with capacity check", () => {
    const script = parseScriptFile(
      "main",
      [
        "async function recover(manager, options) {",
        "  if (!manager.hasCapacity(options)) return;",
        "  const area = await manager.createTickingArea('arena:recover', options);",
        "  if (!area.isFullyLoaded) return;",
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
        "  const area = await manager.createTickingArea('arena:recover', options);",
        "  if (!area.isFullyLoaded) return;",
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

  it("keeps capacity-checked leases unverified until readiness is observed", () => {
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

    expect(result.readinessUnverifiedLeases)
      .toBe(1);
    expect(result.pairedLeases).toBe(0);
  });

  it("does not treat unrelated release code as a paired cleanup path", () => {
    const script = parseScriptFile(
      "main",
      [
        "async function acquire(manager, options) {",
        "  if (!manager.hasCapacity(options)) return;",
        "  await manager.createTickingArea('arena:recover', options);",
        "}",
        "function maintenance(manager) {",
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

    expect(result.releaseUnreachable).toBe(1);
    expect(result.pairedLeases).toBe(0);
  });

  it("keeps shared cleanup owner as order-unproven without acquire-to-release path", () => {
    const script = parseScriptFile(
      "main",
      [
        "async function run(manager, options) {",
        "  await acquire(manager, options);",
        "  cleanup(manager);",
        "}",
        "async function acquire(manager, options) {",
        "  if (!manager.hasCapacity(options)) return;",
        "  const area = await manager.createTickingArea('arena:recover', options);",
        "  if (!area.isFullyLoaded) return;",
        "}",
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

    expect(result.cleanupOrderUnproven)
      .toBe(1);
    expect(result.pairedLeases).toBe(0);
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

  it("recognizes world-load reconciliation through a cleanup helper", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.worldLoad.subscribe(() => {",
        "  reconcile(manager);",
        "});",
        "function reconcile(manager) {",
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

    expect(result.worldLoadReconciliationPaths).toBe(1);
  });

  it("flags unguarded deferred chunk work that reaches a readiness operation", () => {
    const script = parseScriptFile(
      "main",
      [
        "function schedule(system, dimension) {",
        "  system.runTimeout(() => {",
        "    check(dimension);",
        "  }, 20);",
        "}",
        "function check(dimension) {",
        "  dimension.isChunkLoaded({ x: 0, y: 0, z: 0 });",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeChunkLifecycle([script]);

    expect(result.unguardedDeferredChunkWork).toBe(1);
  });

  it("flags zero-tick deferred chunk recovery work", () => {
    const script = parseScriptFile(
      "main",
      [
        "function schedule(system, dimension) {",
        "  system.runTimeout(() => {",
        "    check(dimension);",
        "  }, 0);",
        "}",
        "function check(dimension) {",
        "  dimension.isChunkLoaded({ x: 0, y: 0, z: 0 });",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeChunkLifecycle([script]);

    expect(
      script.deferredCallbacks[0]
        ?.delayTicks,
    ).toBe(0);
    expect(
      result.zeroTickDeferredChunkWork,
    ).toBe(1);
  });

  it("does not flag bounded positive-delay chunk work as zero-tick", () => {
    const script = parseScriptFile(
      "main",
      [
        "function schedule(system, dimension) {",
        "  system.runTimeout(() => {",
        "    check(dimension);",
        "  }, 1);",
        "}",
        "function check(dimension) {",
        "  dimension.isChunkLoaded({ x: 0, y: 0, z: 0 });",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeChunkLifecycle([script]);

    expect(
      result.zeroTickDeferredChunkWork,
    ).toBe(0);
  });

  it("accepts unloaded-chunk-specific spawn recovery routing", () => {
    const script = parseScriptFile(
      "main",
      [
        "async function spawnWithRecovery(dimension, manager, options) {",
        "  try {",
        "    dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  } catch (error) {",
        "    if (!(error instanceof LocationInUnloadedChunkError)) throw error;",
        "    await recover(manager, options);",
        "  }",
        "}",
        "async function recover(manager, options) {",
        "  if (!manager.hasCapacity(options)) return;",
        "  const area = await manager.createTickingArea('arena:recover', options);",
        "  if (!area.isFullyLoaded) return;",
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

    expect(
      result.spawnRecoveryRoutes,
    ).toBe(1);
    expect(
      result.unloadedSpecificSpawnRecoveryRoutes,
    ).toBe(1);
    expect(
      result.broadSpawnRecoveryRisks,
    ).toBe(0);
  });

  it("flags generic spawn catches that route every error into chunk recovery", () => {
    const script = parseScriptFile(
      "main",
      [
        "async function spawnWithRecovery(dimension, manager, options) {",
        "  try {",
        "    dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  } catch (error) {",
        "    await recover(manager, options);",
        "  }",
        "}",
        "async function recover(manager, options) {",
        "  if (!manager.hasCapacity(options)) return;",
        "  const area = await manager.createTickingArea('arena:recover', options);",
        "  if (!area.isFullyLoaded) return;",
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

    expect(
      result.broadSpawnRecoveryRisks,
    ).toBe(1);
    expect(
      result.unloadedSpecificSpawnRecoveryRoutes,
    ).toBe(0);
  });

  it("does not treat another specific spawn error as unloaded-chunk recovery proof", () => {
    const script = parseScriptFile(
      "main",
      [
        "async function spawnWithRecovery(dimension, manager, options) {",
        "  try {",
        "    dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  } catch (error) {",
        "    if (!(error instanceof InvalidEntityError)) throw error;",
        "    await recover(manager, options);",
        "  }",
        "}",
        "async function recover(manager, options) {",
        "  if (!manager.hasCapacity(options)) return;",
        "  const area = await manager.createTickingArea('arena:recover', options);",
        "  if (!area.isFullyLoaded) return;",
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

    expect(
      result.otherSpecificSpawnRecoveryRoutes,
    ).toBe(1);
    expect(
      result.unloadedSpecificSpawnRecoveryRoutes,
    ).toBe(0);
  });

  it("requires death distinction before residency observability is complete", () => {
    const partial = parseScriptFile(
      "partial",
      [
        "world.afterEvents.entityLoad.subscribe(() => {});",
        "world.afterEvents.entityRemove.subscribe(() => {});",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/partial.ts",
      },
    );
    const complete = parseScriptFile(
      "complete",
      [
        "world.afterEvents.entityLoad.subscribe(() => {});",
        "world.afterEvents.entityRemove.subscribe(() => {});",
        "world.afterEvents.entityDie.subscribe(() => {});",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/complete.ts",
      },
    );

    expect(
      analyzeChunkLifecycle([
        partial,
      ]).entityResidencyObservability,
    ).toBe("partial");
    expect(
      analyzeChunkLifecycle([
        complete,
      ]).entityResidencyObservability,
    ).toBe("complete");
  });

  it("flags entityRemove handlers that directly promote residency to dead or lost", () => {
    const script = parseScriptFile(
      "main",
      [
        "let residencyState = 'RESIDENT';",
        "world.afterEvents.entityRemove.subscribe(() => {",
        "  residencyState = 'DEAD';",
        "});",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeChunkLifecycle([script]);

    expect(
      result.entityRemoveTerminalizationRisks,
    ).toBe(1);
    expect(
      result.entityResidencyObservability,
    ).toBe("partial");
  });

  it("allows entityRemove to transition into a non-terminal missing candidate state", () => {
    const script = parseScriptFile(
      "main",
      [
        "let residencyState = 'RESIDENT';",
        "world.afterEvents.entityRemove.subscribe(() => {",
        "  residencyState = 'UNLOADED_OR_REMOVED';",
        "});",
        "world.afterEvents.entityDie.subscribe(() => {",
        "  residencyState = 'DEAD_CONFIRMED';",
        "});",
        "world.afterEvents.entityLoad.subscribe(() => {",
        "  residencyState = 'RESIDENT';",
        "});",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeChunkLifecycle([script]);

    expect(
      result.entityRemoveTerminalizationRisks,
    ).toBe(0);
    expect(
      result.entityResidencyObservability,
    ).toBe("complete");
  });

  it("accepts an explicit complete entity residency state machine", () => {
    const script = parseScriptFile(
      "main",
      [
        "type ResidencyState = 'RESIDENT' | 'UNLOADED_OR_REMOVED' | 'DEAD_CONFIRMED' | 'EXPLICITLY_REMOVED' | 'MISSING_CANDIDATE' | 'UNKNOWN';",
        "const residencyTransitions: Record<ResidencyState, readonly ResidencyState[]> = {",
        "  RESIDENT: ['UNLOADED_OR_REMOVED', 'DEAD_CONFIRMED', 'EXPLICITLY_REMOVED'],",
        "  UNLOADED_OR_REMOVED: ['RESIDENT', 'MISSING_CANDIDATE', 'DEAD_CONFIRMED'],",
        "  DEAD_CONFIRMED: [],",
        "  EXPLICITLY_REMOVED: [],",
        "  MISSING_CANDIDATE: ['RESIDENT', 'DEAD_CONFIRMED', 'EXPLICITLY_REMOVED', 'UNKNOWN'],",
        "  UNKNOWN: ['RESIDENT', 'MISSING_CANDIDATE'],",
        "};",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeChunkLifecycle([script]);

    expect(
      result.completeResidencyStateMachines,
    ).toBe(1);
    expect(
      result.unresolvedResidencyStateMachines,
    ).toBe(0);
  });

  it("keeps a found-missing style residency machine unresolved", () => {
    const script = parseScriptFile(
      "main",
      [
        "type ResidencyState = 'RESIDENT' | 'MISSING_CANDIDATE';",
        "const residencyTransitions: Record<ResidencyState, readonly ResidencyState[]> = {",
        "  RESIDENT: ['MISSING_CANDIDATE'],",
        "  MISSING_CANDIDATE: ['RESIDENT'],",
        "};",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeChunkLifecycle([script]);

    expect(
      result.unresolvedResidencyStateMachines,
    ).toBe(1);
    expect(
      result.residencyStateMachines[0]
        ?.missingStates,
    ).toEqual(
      expect.arrayContaining([
        "unloadedorremoved",
        "deadconfirmed",
        "explicitlyremoved",
        "unknown",
      ]),
    );
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
