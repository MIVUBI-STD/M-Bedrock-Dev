import { describe, expect, it } from "vitest";
import type {
  ParsedScriptFile,
} from "../../../analyzers/scripts/src/index.js";
import {
  buildGameplayIntentModel,
} from "../src/gameplay-intent-stage.js";

const source = {
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

    expect(model.invariants).toEqual([]);
  });

  it("does not invent intent when no grounded signal exists", () => {
    const empty: ParsedScriptFile = {
      ...parsed(),
      identifier: "main",
      source: { relativePath: "behavior_packs/demo/scripts/main.js" },
      localFunctionCalls: [],
      lifecycleMemberExposures: [],
      enumValueComparisons: [],
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
