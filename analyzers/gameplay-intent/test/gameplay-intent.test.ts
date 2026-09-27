import { describe, expect, it } from "vitest";
import {
  extractGameplayIntentSignals,
} from "../src/index.js";
import type {
  ParsedScriptFile,
} from "../../scripts/src/index.js";

const source = {
  artifactId: "art_test",
  relativePath:
    "behavior_packs/demo/src/domain/session-state-machine.ts",
};

function script(): ParsedScriptFile {
  return {
    identifier: "domain/session-state-machine.ts",
    source,
    imports: [],
    events: [],
    dynamicProperties: [],
    restrictedMutations: [],
    deferredCallbacks: [],
    localFunctionCalls: [{
      callerRegion: "module",
      targetRegion: "function:resetArena",
      targetName: "resetArena",
      source,
    }],
    blockMatchGuards: [],
    methodCalls: [],
    propertyAccesses: [],
    propertyWrites: [],
    entityEventTriggers: [],
    commandLiterals: [{
      command: "scoreboard players add @s coins 1",
      source,
    }],
    lifecycleMemberExposures: [{
      member: "recoveryPolicy",
      candidateSymbols: ["RecoveryPolicy"],
      evidence: "exact-symbol",
      exactSymbol: "RecoveryPolicy",
      source,
    }],
    moduleMemberAccesses: [],
    importedSymbols: [],
    enumValueComparisons: [{
      module: "./types",
      enumName: "SessionState",
      member: "Active",
      symbol: "SessionState.Active",
      operator: "===",
      literal: "active",
      source,
    }],
    stateMutations: [{
      target: "session.state",
      targetName: "state",
      value: {
        kind: "member",
        owner: "SessionState",
        member: "Active",
        symbol: "SessionState.Active",
      },
      executionRegion: "function:resetArena",
      source,
    }],
    typeProperties: [
      {
        containerName: "ResourceRecord",
        propertyName: "owner",
        typeText: "SessionToken",
        optional: false,
        source,
      },
      {
        containerName: "GameSession",
        propertyName: "resources",
        typeText: "ResourceRecord[]",
        optional: false,
        source,
      },
    ],
    transitionDeclarations: [{
      tableName: "TRANSITIONS",
      stateType: "SessionPhase",
      from: "active",
      to: ["finishing", "failed"],
      source,
    }],
    returnOutcomes: [
      {
        executionRegion: "function:decideReconnect",
        propertyName: "action",
        value: "cleanup",
        source,
      },
      {
        executionRegion: "function:decideReconnect",
        propertyName: "action",
        value: "lobby",
        source,
      },
    ],
    guardedOutcomes: [{
      executionRegion: "function:decideReconnect",
      conditionText: "state.pendingCleanup",
      conditionIdentifiers: ["state", "state.pendingCleanup"],
      predicate: {
        kind: "truthy",
        operand: {
          kind: "path",
          path: "state.pendingCleanup",
        },
      },
      propertyName: "action",
      value: "cleanup",
      conditionSource: source,
      outcomeSource: source,
    }],
    capabilities: [],
  };
}

describe("gameplay intent analyzer", () => {
  it("avoids treating build-prefixed helper functions as gameplay phases", () => {
    const base = script();
    const helper = (
      relativePath: string,
      identifier: string,
    ): ParsedScriptFile => ({
      ...base,
      identifier,
      source: {
        artifactId: "art_test",
        relativePath,
      },
      localFunctionCalls: [],
      lifecycleMemberExposures: [],
      enumValueComparisons: [],
      stateMutations: [],
      typeProperties: [],
      transitionDeclarations: [],
      returnOutcomes: [],
      guardedOutcomes: [],
      commandLiterals: [],
    });

    const result = extractGameplayIntentSignals([
      helper(
        "behavior_packs/demo/scripts/domain/buildInventory.js",
        "scripts/domain/buildInventory",
      ),
      helper(
        "behavior_packs/demo/scripts/domain/buildMutationPolicy.js",
        "scripts/domain/buildMutationPolicy",
      ),
      helper(
        "behavior_packs/demo/scripts/ui/buildHud.js",
        "scripts/ui/buildHud",
      ),
    ]);

    expect(
      result.signals.some(
        (signal) =>
          signal.subjectKey === "resource:build-inventory",
      ),
    ).toBe(true);
    expect(
      result.signals.some(
        (signal) =>
          signal.subjectKey === "policy:build-mutation-policy",
      ),
    ).toBe(true);
    expect(
      result.signals.some(
        (signal) =>
          signal.subjectKey === "mechanic:build-hud",
      ),
    ).toBe(true);
    expect(
      result.signals.some(
        (signal) =>
          signal.subjectKey.startsWith("phase:build-"),
      ),
    ).toBe(false);
  });

  it("classifies helper verbs by their specific gameplay noun instead of phase keywords", () => {
    const base = script();
    const helper = (
      relativePath: string,
      identifier: string,
    ): ParsedScriptFile => ({
      ...base,
      identifier,
      source: {
        artifactId: "art_test",
        relativePath,
      },
      localFunctionCalls: [],
      lifecycleMemberExposures: [],
      enumValueComparisons: [],
      stateMutations: [],
      typeProperties: [],
      transitionDeclarations: [],
      returnOutcomes: [],
      guardedOutcomes: [],
      commandLiterals: [],
    });

    const result = extractGameplayIntentSignals([
      helper(
        "behavior_packs/demo/scripts/domain/calculateCombatQuality.js",
        "scripts/domain/calculateCombatQuality",
      ),
      helper(
        "behavior_packs/demo/scripts/domain/getFortifyWaveSize.js",
        "scripts/domain/getFortifyWaveSize",
      ),
      helper(
        "behavior_packs/demo/scripts/domain/getFortifyTierResources.js",
        "scripts/domain/getFortifyTierResources",
      ),
      helper(
        "behavior_packs/demo/scripts/domain/getCombatPhaseCountdownSeconds.js",
        "scripts/domain/getCombatPhaseCountdownSeconds",
      ),
    ]);

    expect(
      result.signals.some(
        (signal) =>
          signal.subjectKey ===
          "mechanic:calculate-combat-quality",
      ),
    ).toBe(true);
    expect(
      result.signals.some(
        (signal) =>
          signal.subjectKey ===
          "mechanic:get-fortify-wave-size",
      ),
    ).toBe(true);
    expect(
      result.signals.some(
        (signal) =>
          signal.subjectKey ===
          "resource:get-fortify-tier-resources",
      ),
    ).toBe(true);
    expect(
      result.signals.some(
        (signal) =>
          signal.subjectKey ===
          "resource:get-combat-phase-countdown-seconds",
      ),
    ).toBe(true);

    expect(
      result.signals.some(
        (signal) =>
          signal.subjectKey.startsWith("phase:calculate-") ||
          signal.subjectKey.startsWith("phase:get-fortify-") ||
          signal.subjectKey.startsWith("phase:get-combat-"),
      ),
    ).toBe(false);
  });

  it("recovers gameplay concepts from declared bundled class members", () => {
    const base = script();
    const bundled: ParsedScriptFile = {
      ...base,
      identifier: "scripts/main",
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/demo/scripts/main.js",
      },
      localFunctionCalls: [],
      lifecycleMemberExposures: [],
      enumValueComparisons: [],
      stateMutations: [],
      typeProperties: [],
      transitionDeclarations: [],
      returnOutcomes: [],
      guardedOutcomes: [],
      commandLiterals: [],
      declaredMembers: [
        {
          member: "phase",
          memberKind: "property",
          containerHint: "A",
          source: base.source,
        },
        {
          member: "reconnect",
          memberKind: "method",
          containerHint: "A",
          source: base.source,
        },
        {
          member: "disconnect",
          memberKind: "method",
          containerHint: "A",
          source: base.source,
        },
        {
          member: "clearPlayerInventory",
          memberKind: "method",
          containerHint: "B",
          source: base.source,
        },
        {
          member: "getNearbyReviver",
          memberKind: "method",
          containerHint: "C",
          source: base.source,
        },
        {
          member: "initializeScoreboard",
          memberKind: "method",
          containerHint: "C",
          source: base.source,
        },
      ],
    };

    const result = extractGameplayIntentSignals([bundled]);
    const ids = new Set(
      result.signals.map((signal) => signal.subjectKey),
    );

    expect(ids.has("phase:phase")).toBe(true);
    expect(ids.has("lifecycle:reconnect")).toBe(true);
    expect(ids.has("lifecycle:disconnect")).toBe(true);
    expect(ids.has("resource:clear-player-inventory")).toBe(true);
    expect(ids.has("mechanic:get-nearby-reviver")).toBe(true);
    expect(ids.has("resource:initialize-scoreboard")).toBe(true);
  });

  it("keeps phase classification for state-like names but not phase helper actions", () => {
    const base = script();
    const helper = (
      member: string,
    ): ParsedScriptFile => ({
      ...base,
      identifier: "scripts/main",
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/demo/scripts/main.js",
      },
      localFunctionCalls: [],
      lifecycleMemberExposures: [],
      enumValueComparisons: [],
      stateMutations: [],
      typeProperties: [],
      transitionDeclarations: [],
      returnOutcomes: [],
      guardedOutcomes: [],
      commandLiterals: [],
      declaredMembers: [{
        member,
        memberKind: "method",
        containerHint: "A",
        source: base.source,
      }],
    });

    const result = extractGameplayIntentSignals([
      helper("active"),
      helper("cinematic"),
      helper("finishStage1"),
      helper("startStageTimers"),
      helper("updateStageTimers"),
      helper("stopCountdown"),
      helper("refreshLobbyEffects"),
      helper("teleportLobby"),
      helper("clearPlayerHudForLobbyReturn"),
      helper("countdownFeedback"),
    ]);

    const ids = new Set(
      result.signals.map((signal) => signal.subjectKey),
    );

    expect(ids.has("phase:active")).toBe(true);
    expect(ids.has("phase:cinematic")).toBe(true);

    expect(ids.has("phase:finish-stage1")).toBe(false);
    expect(ids.has("phase:start-stage-timers")).toBe(false);
    expect(ids.has("phase:update-stage-timers")).toBe(false);
    expect(ids.has("phase:stop-countdown")).toBe(false);
    expect(ids.has("phase:refresh-lobby-effects")).toBe(false);
    expect(ids.has("phase:teleport-lobby")).toBe(false);
    expect(ids.has("phase:clear-player-hud-for-lobby-return")).toBe(false);
    expect(ids.has("phase:countdown-feedback")).toBe(false);

    expect(ids.has("resource:start-stage-timers")).toBe(true);
    expect(ids.has("resource:update-stage-timers")).toBe(true);
    expect(ids.has("mechanic:refresh-lobby-effects")).toBe(true);
    expect(ids.has("spatial-region:teleport-lobby")).toBe(true);
    expect(ids.has("mechanic:clear-player-hud-for-lobby-return")).toBe(true);
    expect(ids.has("mechanic:countdown-feedback")).toBe(true);
  });

  it("accepts kind/type return discriminants only for classified gameplay functions", () => {
    const base = script();
    const reconnect: ParsedScriptFile = {
      ...base,
      identifier: "scripts/domain/reconnect",
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/demo/scripts/domain/reconnect.js",
      },
      localFunctionCalls: [],
      lifecycleMemberExposures: [],
      enumValueComparisons: [],
      stateMutations: [],
      typeProperties: [],
      transitionDeclarations: [],
      commandLiterals: [],
      returnOutcomes: [
        {
          executionRegion: "function:decideReconnect",
          propertyName: "kind",
          value: "cleanup_to_lobby",
          source: base.source,
        },
        {
          executionRegion: "function:helper",
          propertyName: "kind",
          value: "internal",
          source: base.source,
        },
      ],
      guardedOutcomes: [{
        executionRegion: "function:decideReconnect",
        conditionText: "membership === undefined",
        conditionIdentifiers: ["membership"],
        predicate: {
          kind: "comparison",
          operator: "eq",
          left: { kind: "path", path: "membership" },
          right: { kind: "literal", value: null },
        },
        propertyName: "kind",
        value: "cleanup_to_lobby",
        conditionSource: base.source,
        outcomeSource: base.source,
      }],
    };

    const result = extractGameplayIntentSignals([reconnect]);

    expect(
      result.signals.some(
        (signal) =>
          signal.subjectKey ===
          "outcome:decide-reconnect-cleanup-to-lobby",
      ),
    ).toBe(true);
    expect(
      result.signals.some(
        (signal) =>
          signal.subjectKey === "outcome:helper-internal",
      ),
    ).toBe(false);
  });

  it("extracts authored and inferred intent signals without map-specific names", () => {
    const result = extractGameplayIntentSignals([script()]);

    expect(
      result.signals.some(
        (signal) =>
          signal.subjectKey ===
          "state:session-state-active" &&
          signal.status === "authored",
      ),
    ).toBe(true);

    expect(
      result.signals.some(
        (signal) =>
          signal.nodeKind === "lifecycle" &&
          signal.status === "authored",
      ),
    ).toBe(true);

    expect(
      result.signals.some(
        (signal) =>
          signal.subjectKey === "resource:coins",
      ),
    ).toBe(true);

    expect(
      result.relations.some(
        (relation) =>
          relation.edgeKind === "transitions-to" &&
          relation.toSubjectKey ===
            "state:session-state-active",
      ),
    ).toBe(true);

    expect(
      result.relations.some(
        (relation) =>
          relation.edgeKind === "owns" &&
          relation.status === "authored",
      ),
    ).toBe(true);

    expect(
      result.relations.some(
        (relation) =>
          relation.edgeKind === "transitions-to" &&
          relation.status === "authored" &&
          relation.fromSubjectKey ===
            "state:session-phase-active" &&
          relation.toSubjectKey ===
            "state:session-phase-finishing",
      ),
    ).toBe(true);

    expect(
      result.signals.some(
        (signal) =>
          signal.nodeKind === "outcome" &&
          signal.subjectKey ===
            "outcome:decide-reconnect-cleanup",
      ),
    ).toBe(true);

    expect(
      result.signals.some(
        (signal) =>
          signal.nodeKind === "policy" &&
          signal.subjectKey.includes("pending-cleanup") &&
          signal.policyPredicate?.kind === "truthy",
      ),
    ).toBe(true);

    expect(
      result.relations.some(
        (relation) =>
          relation.edgeKind === "requires" &&
          relation.status === "authored" &&
          relation.fromSubjectKey ===
            "outcome:decide-reconnect-cleanup" &&
          relation.toSubjectKey.startsWith("policy:"),
      ),
    ).toBe(true);

    expect(
      result.outcomePolicyCoverage.find(
        (item) =>
          item.outcomeSubjectKey ===
          "outcome:decide-reconnect-cleanup",
      ),
    ).toEqual(expect.objectContaining({
      totalLiteralReturnSites: 1,
      directlyGuardedReturnSites: 1,
      completeDirectGuardCoverage: true,
    }));

    expect(
      result.outcomePolicyCoverage.find(
        (item) =>
          item.outcomeSubjectKey ===
          "outcome:decide-reconnect-lobby",
      ),
    ).toEqual(expect.objectContaining({
      totalLiteralReturnSites: 1,
      directlyGuardedReturnSites: 0,
      completeDirectGuardCoverage: false,
    }));
  });
});
