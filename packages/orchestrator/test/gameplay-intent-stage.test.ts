import { describe, expect, it } from "vitest";
import type {
  ParsedScriptFile,
} from "../../../analyzers/scripts/src/index.js";
import {
  buildGameplayIntentModel,
} from "../src/gameplay-intent-stage.js";

const source = {
  artifactId: "art_test",
  relativePath:
    "behavior_packs/mtt_bp/src/domain/session-state-machine.ts",
};

function parsed(): ParsedScriptFile {
  return {
    identifier: "session-state-machine",
    source,
    imports: [],
    events: [],
    dynamicProperties: [],
    restrictedMutations: [],
    deferredCallbacks: [],
    localFunctionCalls: [{
      callerRegion: "module",
      targetRegion: "function:resetSession",
      targetName: "resetSession",
      source,
    }],
    blockMatchGuards: [],
    methodCalls: [],
    propertyAccesses: [],
    propertyWrites: [],
    entityEventTriggers: [],
    commandLiterals: [],
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
      executionRegion: "function:resetSession",
      source,
    }],
    typeProperties: [{
      containerName: "ResourceRecord",
      propertyName: "owner",
      typeText: "SessionToken",
      optional: false,
      source,
    }],
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

describe("gameplay intent stage", () => {
  it("builds a validated parser-independent model from analyzer signals", () => {
    const model = buildGameplayIntentModel({
      id: "mtt-level-2",
      parsedScripts: [{ parsed: parsed() }],
    });

    expect(
      model.nodes.some(
        (node) =>
          node.id === "state:session-state-active" &&
          node.status === "authored",
      ),
    ).toBe(true);

    expect(
      model.nodes.some(
        (node) =>
          node.kind === "lifecycle" &&
          node.status === "authored",
      ),
    ).toBe(true);

    expect(
      model.edges.some(
        (edge) =>
          edge.kind === "transitions-to" &&
          edge.to === "state:session-state-active",
      ),
    ).toBe(true);

    expect(
      model.edges.some(
        (edge) =>
          edge.kind === "owns" &&
          edge.status === "authored",
      ),
    ).toBe(true);

    expect(
      model.invariants.some(
        (invariant) =>
          invariant.id ===
            "inv:allowed-transitions:state:session-phase-active" &&
          invariant.status === "inferred",
      ),
    ).toBe(true);

    expect(
      model.nodes.some(
        (node) =>
          node.id === "outcome:decide-reconnect-cleanup" &&
          node.status === "authored",
      ),
    ).toBe(true);

    expect(
      model.edges.some(
        (edge) =>
          edge.from === "outcome:decide-reconnect-cleanup" &&
          edge.kind === "requires" &&
          edge.status === "authored" &&
          edge.to.startsWith("policy:"),
      ),
    ).toBe(true);

    expect(
      model.nodes.some(
        (node) =>
          node.kind === "policy" &&
          node.policyPredicate?.kind === "truthy",
      ),
    ).toBe(true);

    expect(
      model.invariants.some(
        (invariant) =>
          invariant.id ===
          "inv:admissible-policy:outcome:decide-reconnect-cleanup" &&
          invariant.status === "inferred",
      ),
    ).toBe(true);

    expect(
      model.unknowns.some(
        (unknown) =>
          unknown.id ===
          "unknown:outcome-policy-coverage:outcome:decide-reconnect-lobby" &&
          unknown.blockedSubjectIds.includes(
            "outcome:decide-reconnect-lobby",
          ),
      ),
    ).toBe(true);
  });

  it("prefers typed authored transitions over duplicate untyped runtime transitions", () => {
    const runtimeParsed: ParsedScriptFile = {
      ...parsed(),
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/mtt_bp/scripts/domain/session-state-machine.js",
      },
      typeProperties: [],
      transitionDeclarations: [{
        tableName: "TRANSITIONS",
        from: "active",
        to: ["finishing", "failed"],
        source: {
          artifactId: "art_test",
          relativePath:
            "behavior_packs/mtt_bp/scripts/domain/session-state-machine.js",
        },
      }],
    };

    const authoredParsed: ParsedScriptFile = {
      ...parsed(),
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/mtt_bp/src/domain/session-state-machine.ts",
      },
      transitionDeclarations: [{
        tableName: "TRANSITIONS",
        stateType: "SessionPhase",
        from: "active",
        to: ["finishing", "failed"],
        source: {
          artifactId: "art_test",
          relativePath:
            "behavior_packs/mtt_bp/src/domain/session-state-machine.ts",
        },
      }],
    };

    const model = buildGameplayIntentModel({
      id: "typed-transition",
      parsedScripts: [{ parsed: runtimeParsed }],
      authoredScripts: [{ parsed: authoredParsed }],
    });

    expect(
      model.nodes.some(
        (node) =>
          node.id === "state:session-phase-active",
      ),
    ).toBe(true);

    expect(
      model.nodes.some(
        (node) =>
          node.id === "state:transitions-active",
      ),
    ).toBe(false);
  });

  it("merges duplicate semantic relations from runtime and authored sources", () => {
    const runtimeParsed: ParsedScriptFile = {
      ...parsed(),
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/demo/scripts/recovery.js",
      },
      localFunctionCalls: [{
        callerRegion: "function:decideReconnect",
        targetRegion: "function:cleanupSession",
        targetName: "cleanupSession",
        source: {
          artifactId: "art_test",
          relativePath:
            "behavior_packs/demo/scripts/recovery.js",
        },
      }],
      typeProperties: [],
      transitionDeclarations: [],
      stateMutations: [],
      returnOutcomes: [],
      guardedOutcomes: [],
    };

    const authoredParsed: ParsedScriptFile = {
      ...runtimeParsed,
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/demo/src/recovery.ts",
      },
      localFunctionCalls: [{
        callerRegion: "function:decideReconnect",
        targetRegion: "function:cleanupSession",
        targetName: "cleanupSession",
        source: {
          artifactId: "art_test",
          relativePath:
            "behavior_packs/demo/src/recovery.ts",
        },
      }],
    };

    const model = buildGameplayIntentModel({
      id: "relation-merge",
      parsedScripts: [{ parsed: runtimeParsed }],
      authoredScripts: [{ parsed: authoredParsed }],
    });

    const matching = model.edges.filter(
      (edge) =>
        edge.kind === "requires" &&
        edge.from === "lifecycle:decide-reconnect" &&
        edge.to === "lifecycle:cleanup-session",
    );

    expect(matching).toHaveLength(1);
    expect(matching[0]?.evidenceIds).toHaveLength(2);
  });

  it("does not invent intent when no grounded signal exists", () => {
    const empty: ParsedScriptFile = {
      ...parsed(),
      identifier: "main",
      source: { artifactId: "art_test", relativePath: "behavior_packs/demo/scripts/main.js" },
      localFunctionCalls: [],
      lifecycleMemberExposures: [],
      enumValueComparisons: [],
      stateMutations: [],
      typeProperties: [],
      transitionDeclarations: [],
      returnOutcomes: [],
      guardedOutcomes: [],
    };

    const model = buildGameplayIntentModel({
      id: "unknown-map",
      parsedScripts: [{ parsed: empty }],
    });

    expect(model.nodes).toEqual([]);
    expect(model.unknowns[0]?.id).toBe(
      "unknown:no-intent-signals",
    );
  });
});
