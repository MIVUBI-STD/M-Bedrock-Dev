import { describe, expect, it } from "vitest";
import {
  parseScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import {
  analyzePersistenceSource,
} from "../../src/inspection/persistence-source-analysis.js";

describe("persistence source analysis", () => {
  it("summarizes growth without promoting it to a defect", () => {
    const script = parseScriptFile(
      "main",
      `
        const history = JSON.parse(
          world.getDynamicProperty("history") ?? "[]"
        );
        history.push("match");
        world.setDynamicProperty(
          "history",
          JSON.stringify(history),
        );
      `,
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzePersistenceSource([script]);

    expect(result.appendWithoutClear).toBe(1);
    expect(
      result.worldScopedAppendWithoutClear,
    ).toBe(1);
    expect(result.properties[0]).toMatchObject({
      propertyId: "history",
      scope: "world",
      lifetime: "world",
      growth: "append-without-clear",
    });
  });

  it("projects exact reset sites without promoting source cleanup into a bounded lifetime", () => {
    const parsed = parseScriptFile("main", [
      'function reset(player) {',
      '  world.setDynamicProperty("matchSession", undefined);',
      '  player.setDynamicProperty("matchSession", "[]");',
      '  world.clearDynamicProperties();',
      '}',
    ].join("\n"), {
      artifactId: "a", relativePath: "scripts/main.ts",
    });
    const analysis = analyzePersistenceSource([parsed]);
    const property = analysis.properties.find(x => x.propertyId === "matchSession");
    expect(property?.scope).toBe("unknown");
    expect(property?.lifetime).toBe("unknown");
    expect(property?.resetSites).toHaveLength(2);
    expect(property?.resetSites?.map(x => x.receiverHint))
      .toEqual(["world", "player"]);
    expect(property?.resetSites?.map(x => x.kind))
      .toEqual(["undefined-removal", "empty-value-write"]);
    expect(property?.resetSites?.every(x =>
      x.executionRegion === "function:reset" &&
      x.source.relativePath === "scripts/main.ts")).toBe(true);
  });

  it("binds a property-specific reset to an exact playerLeave local-call path but not runtime completion", () => {
    const source = { artifactId: "map:one", relativePath: "scripts/lifecycle.ts" };
    const parsed = parseScriptFile("lifecycle", [
      'function clearRound() {',
      '  world.setDynamicProperty("roundState", undefined);',
      '}',
      'function onLeave(event) { clearRound(); }',
      'world.afterEvents.playerLeave.subscribe(onLeave);',
    ].join("\n"), source);
    const resetSite = parsed.persistentDataLifecycleEvidence
      ?.find(item => item.propertyKey === "roundState")?.resetSites?.[0];
    expect(resetSite).toBeDefined();
    // Explicit same-region generation evidence is not evidence that this
    // invalidation refers to the same player/property.
    parsed.arenaAuthorityEvidence = [{
      kind: "generation-invalidate", arenaExpression: "arena",
      generationExpression: "arena.generation",
      executionRegion: "function:clearRound",
      source: { ...source, range: {
        lineStart: 2, lineEnd: 2, columnStart: 1, columnEnd: 10,
      } },
    }];
    const result = analyzePersistenceSource([parsed]);
    expect(result.resetLifecycleAssociations).toHaveLength(1);
    const association = result.resetLifecycleAssociations[0]!;
    expect(association).toMatchObject({
      scriptId: "lifecycle", propertyId: "roundState",
      receiverHint: "world", resetKind: "undefined-removal",
      lifecycleEvent: "playerLeave", callbackRegion: "function:onLeave",
      resetRegion: "function:clearRound",
      pathKind: "local-call-reachable",
      evidenceStatus: "STATIC_SOURCE_REACHABILITY_ONLY",
    });
    expect(association.eventSource.relativePath).toBe(source.relativePath);
    expect(association.resetSource).toEqual(resetSite?.source);
    expect(association.coLocatedGenerationInvalidationSources)
      .toEqual([parsed.arenaAuthorityEvidence[0]!.source]);
    expect(result.properties.find(item => item.propertyId === "roundState")
      ?.lifetime).toBe("unknown");
  });

  it("keeps direct lifecycle callbacks separate from unconnected and non-lifecycle reset sites", () => {
    const source = { artifactId: "map:one", relativePath: "scripts/events.ts" };
    const parsed = parseScriptFile("events", [
      'world.afterEvents.playerSpawn.subscribe((event) => {',
      '  event.player.setDynamicProperty("sessionState", undefined);',
      '});',
      'function unusedReset() { world.setDynamicProperty("orphan", undefined); }',
      'world.afterEvents.playerBreakBlock.subscribe(() => {',
      '  world.setDynamicProperty("breaking", undefined);',
      '});',
    ].join("\n"), source);
    const result = analyzePersistenceSource([parsed]);
    expect(result.resetLifecycleAssociations).toHaveLength(1);
    expect(result.resetLifecycleAssociations[0]).toMatchObject({
      propertyId: "sessionState", lifecycleEvent: "playerSpawn",
      pathKind: "same-region", receiverHint: "event.player",
      coLocatedGenerationInvalidationSources: [],
    });
    const keys = result.properties.filter(item => item.resetSites?.length)
      .map(item => item.propertyId);
    expect(keys).toEqual(["breaking", "orphan", "sessionState"]);
    expect(result.resetLifecycleAssociations.every(item =>
      item.propertyId !== "orphan" && item.propertyId !== "breaking"))
      .toBe(true);
  });

  it("rejects reset associations when a reset source belongs to a different artifact", () => {
    const source = { artifactId: "map:one", relativePath: "scripts/events.ts" };
    const parsed = parseScriptFile("events", [
      'world.afterEvents.playerLeave.subscribe(() => {',
      '  world.setDynamicProperty("phase", undefined);',
      '});',
    ].join("\n"), source);
    const lifecycle = parsed.persistentDataLifecycleEvidence?.[0];
    expect(lifecycle?.resetSites).toHaveLength(1);
    parsed.persistentDataLifecycleEvidence = [{
      ...lifecycle!,
      resetSites: lifecycle!.resetSites!.map(site => ({
        ...site, source: { ...site.source, artifactId: "map:other" },
      })),
    }];
    expect(analyzePersistenceSource([parsed]).resetLifecycleAssociations)
      .toEqual([]);

    parsed.persistentDataLifecycleEvidence = [{
      ...lifecycle!,
      resetSites: lifecycle!.resetSites!.map(site => ({
        ...site, source: { artifactId: source.artifactId,
          relativePath: source.relativePath },
      })),
    }];
    // A file-only reference is not an exact reset site and must fail closed.
    expect(analyzePersistenceSource([parsed]).resetLifecycleAssociations)
      .toEqual([]);
  });

  it("records before/after source ordering only for matching receiver and direct block", () => {
    const parsed = parseScriptFile("round", [
      "function clearRound(arena) {",
      "  arena.generation++;",
      '  arena.setDynamicProperty("roundState", undefined);',
      "  arena.generation++;",
      "}",
      "function onLeave() { clearRound(arena); }",
      "world.afterEvents.playerLeave.subscribe(onLeave);",
    ].join("\n"), {
      artifactId: "map:one", relativePath: "scripts/round.ts",
    });
    const result = analyzePersistenceSource([parsed]);
    expect(result.resetLifecycleAssociations).toHaveLength(1);
    const candidate = result.resetLifecycleAssociations[0]!;
    expect(candidate.sequentialGenerationEvidence).toEqual([
      expect.objectContaining({
        arenaExpression: "arena", generationExpression: "arena.generation",
        order: "before-reset", evidenceStatus: "SOURCE_SEQUENCE_ONLY",
        source: expect.objectContaining({
          range: expect.objectContaining({ lineStart: 2 }),
        }),
      }),
      expect.objectContaining({
        arenaExpression: "arena", generationExpression: "arena.generation",
        order: "after-reset", evidenceStatus: "SOURCE_SEQUENCE_ONLY",
        source: expect.objectContaining({
          range: expect.objectContaining({ lineStart: 4 }),
        }),
      }),
    ]);
    expect(candidate.coLocatedGenerationInvalidationSources).toHaveLength(2);
    expect(candidate.evidenceStatus).toBe("STATIC_SOURCE_REACHABILITY_ONLY");
    expect(result.properties.find(x => x.propertyId === "roundState")?.lifetime)
      .toBe("unknown");
  });

  it("blocks source ordering when the receiver is rebound between generation and reset", () => {
    const script = parseScriptFile("arena", [
      "function cleanup(arena, otherArena) {",
      "  arena.generation++;",
      "  arena = otherArena;",
      '  arena.setDynamicProperty("roundState", undefined);',
      "}",
      "world.afterEvents.playerLeave.subscribe(() => cleanup(arena, otherArena));",
    ].join("\n"), {
      artifactId: "map:identity", relativePath: "scripts/lifecycle.ts",
    });
    const candidate = analyzePersistenceSource([script]).resetLifecycleAssociations[0];
    expect(candidate?.coLocatedGenerationInvalidationSources).toHaveLength(1);
    expect(candidate?.sequentialGenerationEvidence).toEqual([]);
    expect(candidate?.evidenceStatus).toBe("STATIC_SOURCE_REACHABILITY_ONLY");
  });

  it("blocks ordering after a nullish receiver reassignment", () => {
    const script = parseScriptFile("arena", [
      "function cleanup(arena, otherArena) {",
      "  arena.generation++;",
      "  arena ??= otherArena;",
      '  arena.setDynamicProperty("roundState", undefined);',
      "}",
      "world.afterEvents.playerLeave.subscribe(() => cleanup(arena, otherArena));",
    ].join("\n"), {
      artifactId: "map:identity", relativePath: "scripts/lifecycle.ts",
    });
    const candidate = analyzePersistenceSource([script]).resetLifecycleAssociations[0];
    expect(candidate?.sequentialGenerationEvidence).toEqual([]);
  });

  it("blocks source ordering when an early exit can prevent the reset", () => {
    const script = parseScriptFile("arena", [
      "function cleanup(arena, skip) {",
      "  arena.generation++;",
      "  if (skip) return;",
      '  arena.setDynamicProperty("roundState", undefined);',
      "}",
      "world.afterEvents.playerLeave.subscribe(() => cleanup(arena, false));",
    ].join("\n"), {
      artifactId: "map:identity", relativePath: "scripts/lifecycle.ts",
    });
    const candidate = analyzePersistenceSource([script]).resetLifecycleAssociations[0];
    expect(candidate?.coLocatedGenerationInvalidationSources).toHaveLength(1);
    expect(candidate?.sequentialGenerationEvidence).toEqual([]);
  });

  it("blocks ordering across a conditional receiver rebinding", () => {
    const script = parseScriptFile("arena", [
      "function cleanup(arena, otherArena, switchOwner) {",
      "  arena.generation++;",
      "  if (switchOwner) { arena = otherArena; }",
      '  arena.setDynamicProperty("roundState", undefined);',
      "}",
      "world.afterEvents.playerLeave.subscribe(() => cleanup(arena, otherArena, true));",
    ].join("\n"), {
      artifactId: "map:identity", relativePath: "scripts/lifecycle.ts",
    });
    const candidate = analyzePersistenceSource([script]).resetLifecycleAssociations[0];
    expect(candidate?.sequentialGenerationEvidence).toEqual([]);
  });

  it("preserves source order for direct siblings with the same earlier exit requirements", () => {
    const script = parseScriptFile("arena", [
      "function cleanup(arena, skip) {",
      "  if (skip) return;",
      "  arena.generation++;",
      '  arena.setDynamicProperty("roundState", undefined);',
      "}",
      "world.afterEvents.playerLeave.subscribe(() => cleanup(arena, false));",
    ].join("\n"), {
      artifactId: "map:identity", relativePath: "scripts/lifecycle.ts",
    });
    const candidate = analyzePersistenceSource([script]).resetLifecycleAssociations[0];
    expect(candidate?.sequentialGenerationEvidence).toEqual([
      expect.objectContaining({
        generationExpression: "arena.generation",
        arenaExpression: "arena",
        order: "before-reset",
        evidenceStatus: "SOURCE_SEQUENCE_ONLY",
      }),
    ]);
  });

  it("refuses generation ordering across conditional blocks or unrelated receivers", () => {
    const parsed = parseScriptFile("round", [
      "function reset(arena, other, flag) {",
      "  if (flag) { arena.generation++; }",
      '  arena.setDynamicProperty("roundState", undefined);',
      "  other.generation++;",
      "  if (flag) arena.generation++;",
      "}",
      "world.afterEvents.playerLeave.subscribe(() => reset(arena, other, true));",
    ].join("\n"), {
      artifactId: "map:one", relativePath: "scripts/round.ts",
    });
    const [candidate] = analyzePersistenceSource([parsed]).resetLifecycleAssociations;
    expect(candidate?.coLocatedGenerationInvalidationSources).toHaveLength(3);
    expect(candidate?.sequentialGenerationEvidence).toEqual([]);
  });

  it("does not upgrade manual generation evidence without an exact block", () => {
    const parsed = parseScriptFile("round", [
      "function reset(arena) {",
      '  arena.setDynamicProperty("roundState", undefined);',
      "}",
      "world.afterEvents.playerLeave.subscribe(() => reset(arena));",
    ].join("\n"), {
      artifactId: "map:one", relativePath: "scripts/round.ts",
    });
    parsed.arenaAuthorityEvidence = [{
      kind: "generation-invalidate",
      arenaExpression: "arena",
      generationExpression: "arena.generation",
      executionRegion: "function:reset",
      source: { artifactId: "map:one", relativePath: "scripts/round.ts",
        range: { lineStart: 1, lineEnd: 1,
          columnStart: 1, columnEnd: 10 } },
    }];
    const [candidate] = analyzePersistenceSource([parsed]).resetLifecycleAssociations;
    expect(candidate?.coLocatedGenerationInvalidationSources).toHaveLength(1);
    expect(candidate?.sequentialGenerationEvidence).toEqual([]);
  });

  it("keeps persisted session state read on reconnect as an explicit reconciliation gap", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.playerJoin.subscribe((event) => {",
        "  restoreSession(event.player);",
        "});",
        "function restoreSession(player) {",
        "  const state = world.getDynamicProperty('matchSession');",
        "  return state;",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzePersistenceSource([script]);

    expect(
      result.reconnectTransientRestoreRiskCount,
    ).toBe(1);
    expect(
      result.reconnectTransientRestoreRisks[0],
    ).toMatchObject({
      propertyId: "matchSession",
      lifecycleEvent: "playerJoin",
      scope: "session",
    });
  });

  it("does not flag player-durable reconnect reads as transient session restore", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.playerJoin.subscribe((event) => {",
        "  const xp = event.player.getDynamicProperty('progressionXp');",
        "  return xp;",
        "});",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzePersistenceSource([script]);

    expect(
      result.reconnectTransientRestoreRiskCount,
    ).toBe(0);
  });

  it("classifies a durable result recovery record by semantic field coverage", () => {
    const script = parseScriptFile(
      "main",
      [
        "function commitResult(resultId) {",
        "  const record = {",
        "    arenaGeneration: 4,",
        "    resultId,",
        "    terminalReason: 'timeout',",
        "    participants: ['a', 'b'],",
        "    objectiveEvidence: { score: 7 },",
        "    commitTick: 1200,",
        "    rewardOperationId: 'reward:' + resultId,",
        "    winningSide: 'blue',",
        "  };",
        "  world.setDynamicProperty('matchResultJournal', JSON.stringify(record));",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzePersistenceSource([script]);

    expect(
      result.completeResultAuditRecords,
    ).toBe(1);
    expect(
      result.resultAuditRecords[0],
    ).toMatchObject({
      propertyKey:
        "matchResultJournal",
      status: "complete",
      missingRequiredFields: [],
    });
  });

  it("keeps an incomplete durable result record explicit instead of treating it as recovery-safe", () => {
    const script = parseScriptFile(
      "main",
      [
        "function commitResult(resultId) {",
        "  world.setDynamicProperty('resultJournal', JSON.stringify({ resultId, terminalReason: 'win' }));",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzePersistenceSource([script]);

    expect(
      result.partialResultAuditRecords,
    ).toBe(1);
    expect(
      result.resultAuditRecords[0]
        ?.missingRequiredFields,
    ).toEqual(
      expect.arrayContaining([
        "arena-generation",
        "participant-snapshot-or-revision",
        "objective-evidence",
        "commit-tick",
        "reward-operation-id",
      ]),
    );
  });
});
