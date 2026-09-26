import { describe, expect, it } from "vitest";
import {
  captureMinecraftRuntimeProfile,
} from "../../runtime-profile/src/index.js";
import {
  BEDROCK_PROFILE_PREFIX,
  BEDROCK_PROBE_PREFIX,
  createBedrockHarnessExperimentHost,
  executeRuntimeExperimentCampaign,
  type BedrockHarnessChannel,
  type BedrockHarnessWaitOptions,
  type RuntimeExperimentDefinition,
} from "../src/index.js";

const targetProfile = captureMinecraftRuntimeProfile({
  schemaVersion: 2,
  product: {
    family: "bedrock-engine",
    edition: "bedrock-retail",
    version: "1.26.40",
  },
  host: "listen-server",
  scriptModules: {
    "@minecraft/server": {
      version: "2.9.0",
      track: "stable",
    },
  },
  experiments: [],
  inventory: {
    scriptModules: "complete",
    experiments: "unknown",
    worldSettings: "unknown",
    packs: "partial",
  },
});

const definition: RuntimeExperimentDefinition = {
  schemaVersion: 1,
  id: "exp:chunk-ready",
  title: "Chunk readiness",
  domain: "chunks",
  requiredContext: "LIVE_MINECRAFT",
  mutationRisk: "read-only",
  targetProfileFingerprint:
    targetProfile.fingerprint,
  fixtureFingerprint: "fixture-a",
  protocol: [{
    id: "observe",
    phase: "observe",
    actionId: "probe.chunk-loaded",
    parameters: {
      dimension: "overworld",
      x: "$factor.x",
      y: 64,
      z: 0,
    },
  }],
  factors: [{
    id: "x",
    description: "Probe x coordinate.",
  }],
  arms: [{
    id: "control",
    role: "control",
    factorValues: { x: 0 },
  }, {
    id: "treatment",
    role: "treatment",
    factorValues: { x: 128 },
  }],
  outcomePredicateIds: ["chunk-ready"],
  minimumRunsPerArm: 1,
};

function fakeChannel(): BedrockHarnessChannel {
  const lines: string[] = [];
  let tick = 10;

  return {
    context: "LIVE_MINECRAFT",
    environmentFingerprint: "env-a",

    async sendScriptEvent(id, message) {
      const payload = JSON.parse(message);

      if (id === "m-bedrock:target-profile") {
        lines.push(
          BEDROCK_PROFILE_PREFIX +
            JSON.stringify({
              schemaVersion: 1,
              bindingId: payload.bindingId,
              runtimeTick: tick++,
              profile: payload.profile,
              binding: {
                source: "script-event",
                sessionBound: true,
              },
            }),
        );
        return;
      }

      if (id === "m-bedrock:probe") {
        const present =
          payload.query.location.x === 0;
        lines.push(
          BEDROCK_PROBE_PREFIX +
            JSON.stringify({
              schemaVersion: 1,
              requestId: payload.requestId,
              probeId: payload.probeId,
              runtimeTick: tick++,
              ok: true,
              state: present
                ? "present"
                : "absent",
              outcomeId: present
                ? payload.outcomeByState.present
                : payload.outcomeByState.absent,
              evidence: {
                predicate: payload.predicate,
                state: present
                  ? "present"
                  : "absent",
                confidence: "observed",
                observedAt: {
                  tick: tick - 1,
                },
              },
              value: present,
            }),
        );
        return;
      }

      throw new Error(
        "Unexpected script event: " + id,
      );
    },

    async waitForLine(
      options: BedrockHarnessWaitOptions,
    ) {
      const index = lines.findIndex(
        (line) =>
          line.startsWith(options.prefix) &&
          options.accept(line),
      );
      if (index < 0) {
        throw new Error(
          "Fake channel timed out.",
        );
      }
      return lines.splice(index, 1)[0]!;
    },
  };
}

describe("bedrock runtime experiment host", () => {
  it("executes read-only probe experiments through the harness protocol", async () => {
    const result =
      await executeRuntimeExperimentCampaign(
        definition,
        createBedrockHarnessExperimentHost({
          channel: fakeChannel(),
          targetProfile,
        }),
      );

    expect(result.invalidTrialErrors).toEqual([]);
    expect(
      result.trials.map((trial) => [
        trial.identity.armId,
        trial.status,
        trial.evidence[0]?.state,
      ]),
    ).toEqual([
      ["control", "completed", "present"],
      ["treatment", "completed", "absent"],
    ]);
  });

  it("refuses profile drift before executing probes", async () => {
    const drifted =
      captureMinecraftRuntimeProfile({
        ...targetProfile.profile,
        host: "client",
      });

    const host =
      createBedrockHarnessExperimentHost({
        channel: fakeChannel(),
        targetProfile: drifted,
      });

    await expect(
      host.executeTrial(
        definition,
        {
          experimentId: definition.id,
          definitionRevision: "unused",
          armId: "control",
          runIndex: 0,
          targetProfileFingerprint:
            definition.targetProfileFingerprint,
          fixtureFingerprint:
            definition.fixtureFingerprint,
          environmentFingerprint: "env-a",
        },
      ),
    ).rejects.toThrow(
      /target profile fingerprint does not match/,
    );
  });
});
