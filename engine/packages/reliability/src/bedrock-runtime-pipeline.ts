import {
  adaptBedrockState,
  type BedrockObservationMapping,
} from "./bedrock-state-adapter.js";
import {
  captureBedrockRuntimeState,
  rawCaptureMetadata,
  type BedrockRuntimeEmitterConfig,
  type BedrockSystemLike,
  type BedrockWorldLike,
  type RuntimeCaptureIssue,
} from "./bedrock-runtime-emitter.js";
import type { RuntimeObservationSnapshot } from "./runtime-observation.js";

export interface BedrockRuntimeSnapshotResult {
  snapshot: RuntimeObservationSnapshot;
  captureIssues: RuntimeCaptureIssue[];
  mappingIssues: ReturnType<typeof adaptBedrockState>["issues"];
}

export function captureBedrockObservationSnapshot(
  world: BedrockWorldLike,
  system: BedrockSystemLike,
  emitter: BedrockRuntimeEmitterConfig,
  mapping: BedrockObservationMapping,
): BedrockRuntimeSnapshotResult {
  const raw = captureBedrockRuntimeState(world, system, emitter);
  const adapted = adaptBedrockState(
    raw.players,
    raw.arenas,
    mapping,
    rawCaptureMetadata(raw),
  );

  return {
    snapshot: adapted.snapshot,
    captureIssues: raw.issues,
    mappingIssues: adapted.issues,
  };
}
