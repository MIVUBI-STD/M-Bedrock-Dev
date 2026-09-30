import { describe, expect, it } from "vitest";
import type {
  MapCompatibilityFingerprint,
  MinecraftUpdateDelta,
  RegressionCase,
} from "../src/index.js";
import {
  buildRegressionExecutionQueue,
} from "../src/index.js";

const fingerprint: MapCompatibilityFingerprint = {
  schemaVersion: 1,
  mapId: "blitz-build",
  minEngineVersions: [],
  editions: ["bedrock"],
  experiments: [],
  commandVerbs: [],
  scriptModules: [],
  capabilityTags: [
    "multiplayer-session",
    "scoreboard",
  ],
  domains: [
    "multiplayer",
    "state",
  ],
  structures: {
    count: 0,
    parsed: 0,
  },
  worldDatabasePresent: true,
  riskSurfaces: [
    "multiplayer-concurrency",
  ],
};

const delta: MinecraftUpdateDelta = {
  toVersion: "1.26.40",
  entries: [{
    id: "player-session-change",
    kind: "behavior-changed",
    domain: "multiplayer",
    capabilityTags: [
      "multiplayer-session",
    ],
    affectedIdentifiers: [],
    summary:
      "Player session lifecycle changed.",
    source: "test",
    confidence: "documented",
  }],
};

const reconnect: RegressionCase = {
  id: "regression:reconnect",
  title: "Reconnect keeps membership",
  domain: "multiplayer",
  discoveredBy: "runtime",
  invariantIds: ["membership"],
  triggerTags: [
    "disconnect",
    "reconnect",
  ],
  capabilityTags: [
    "multiplayer-session",
  ],
  reproduction: [],
  expected: "membership retained",
  observed: "membership missing",
};

const unrelated: RegressionCase = {
  id: "regression:structure",
  title: "Structure loads",
  domain: "structures",
  discoveredBy: "static",
  invariantIds: ["structure"],
  triggerTags: ["load"],
  capabilityTags: [
    "structure-loading",
  ],
  reproduction: [],
  expected: "load",
  observed: "missing",
};

describe("regression execution queue", () => {
  it("selects relevant historical regressions by capability/domain/update overlap", () => {
    const queue =
      buildRegressionExecutionQueue(
        fingerprint,
        delta,
        [reconnect, unrelated],
      );

    expect(
      queue.selectedRegressionIds,
    ).toEqual([
      "regression:reconnect",
    ]);
    expect(
      queue.manualRequired[0]
        ?.updateOverlapIds,
    ).toEqual([
      "player-session-change",
    ]);
  });

  it("only marks regressions runtime-ready when an explicit scenario binding exists", () => {
    const queue =
      buildRegressionExecutionQueue(
        fingerprint,
        delta,
        [reconnect],
        [{
          regressionId:
            "regression:reconnect",
          scenarioId:
            "scenario:reconnect",
        }],
      );

    expect(
      queue.runtimeReady.map(
        (item) => item.regressionId,
      ),
    ).toEqual([
      "regression:reconnect",
    ]);
    expect(
      queue.runtimeReady[0]?.scenarioId,
    ).toBe(
      "scenario:reconnect",
    );
    expect(
      queue.manualRequired,
    ).toEqual([]);
  });

  it("keeps selected regressions manual when no execution binding exists", () => {
    const queue =
      buildRegressionExecutionQueue(
        fingerprint,
        delta,
        [reconnect],
      );

    expect(
      queue.runtimeReady,
    ).toEqual([]);
    expect(
      queue.manualRequired.map(
        (item) => item.regressionId,
      ),
    ).toEqual([
      "regression:reconnect",
    ]);
  });
});
