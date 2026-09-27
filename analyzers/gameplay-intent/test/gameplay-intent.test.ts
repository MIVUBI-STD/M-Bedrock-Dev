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
      propertyName: "action",
      value: "cleanup",
      conditionSource: source,
      outcomeSource: source,
    }],
    capabilities: [],
  };
}

describe("gameplay intent analyzer", () => {
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
          signal.subjectKey.includes("pending-cleanup"),
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
