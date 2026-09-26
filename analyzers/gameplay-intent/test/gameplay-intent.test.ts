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
  });
});
