import type { RuntimeActionCapability } from "../../core/action-capability.js";
import type { RuntimeExperimentDefinition } from "../../core/types.js";

export interface ScriptTickingAreaExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  packId: string;
  areaName: string;
  dimension: string;
  x: number;
  y: number;
  z: number;
  minimumRunsPerArm?: number;
}

export const SCRIPT_TICKING_AREA_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] = [{
    id: "chunk.script-ticking-area-create",
    description:
      "Create a controlled ticking area through the Script API manager for the declared pack and emit creation evidence.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      packId: "string",
      areaName: "string",
      dimension: "string",
      x: "number",
      y: "number",
      z: "number",
    },
  }, {
    id: "chunk.script-ticking-area-observe-pack-scope",
    description:
      "Observe whether a Script API ticking area created by one pack is enumerated/owned under the expected pack scope.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "read-only",
    phases: ["observe"],
    requiredParameters: {
      packId: "string",
      areaName: "string",
    },
  }, {
    id: "chunk.script-ticking-area-remove",
    description:
      "Remove the controlled Script API ticking area owned by the fixture.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["teardown"],
    requiredParameters: {
      packId: "string",
      areaName: "string",
    },
  }];

export function createScriptTickingAreaManagerExperiment(
  input: ScriptTickingAreaExperimentInput,
): RuntimeExperimentDefinition {
  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "chunks",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint: input.targetProfileFingerprint,
    fixtureFingerprint: input.fixtureFingerprint,
    protocol: [{
      id: "create-script-ticking-area",
      phase: "stimulus",
      actionId: "chunk.script-ticking-area-create",
      parameters: {
        packId: input.packId,
        areaName: input.areaName,
        dimension: input.dimension,
        x: input.x,
        y: input.y,
        z: input.z,
      },
    }, {
      id: "observe-pack-scope",
      phase: "observe",
      actionId: "chunk.script-ticking-area-observe-pack-scope",
      parameters: {
        packId: input.packId,
        areaName: input.areaName,
      },
    }, {
      id: "probe-loaded",
      phase: "observe",
      actionId: "probe.chunk-loaded",
      parameters: {
        dimension: input.dimension,
        x: input.x,
        y: input.y,
        z: input.z,
        predicate: "script-ticking-area-created",
      },
    }, {
      id: "remove-script-ticking-area",
      phase: "teardown",
      actionId: "chunk.script-ticking-area-remove",
      parameters: {
        packId: input.packId,
        areaName: input.areaName,
      },
    }],
    factors: [],
    arms: [{ id: "control", role: "control", factorValues: {} }],
    outcomePredicateIds: [
      "script-ticking-area-created",
      "script-ticking-area-scope-observed",
    ],
    evidenceRequirements: [{
      id: "pack-scope-observed",
      predicateId: "script-ticking-area-scope-observed",
      state: "present",
      minimumProofAuthority: "live-runtime",
    }],
    minimumRunsPerArm: input.minimumRunsPerArm ?? 2,
  };
}
