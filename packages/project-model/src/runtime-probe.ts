import type { RuntimeEvidenceRecord, RuntimeScope } from "./runtime-evidence.js";

export type RuntimeProbeState = "present" | "absent" | "unknown";

export type RuntimeProbeQuery =
  | {
      kind: "chunk-loaded";
      dimension: string;
      location: { x: number; y: number; z: number };
    }
  | {
      kind: "entity-resolvable";
      entityId: string;
    }
  | {
      kind: "tag-present";
      subjectKind: "player" | "entity";
      subjectId: string;
      tag: string;
    }
  | {
      kind: "scoreboard-value";
      objectiveId: string;
      participant: string;
      expected?: number;
    };

export interface RuntimeProbeOutcomeMap {
  present: string;
  absent: string;
  unknown?: string;
}

export interface RuntimeProbeRequest {
  schemaVersion: 1;
  requestId: string;
  probeId: string;
  incidentId?: string;
  predicate: string;
  scope?: RuntimeScope;
  runtimeTick?: number;
  query: RuntimeProbeQuery;
  outcomeByState: RuntimeProbeOutcomeMap;
}

export interface RuntimeProbeResponse {
  schemaVersion: 1;
  requestId: string;
  probeId: string;
  runtimeTick: number;
  ok: boolean;
  state: RuntimeProbeState;
  outcomeId?: string;
  evidence: RuntimeEvidenceRecord;
  value?: string | number | boolean;
  error?: string;
}


export interface RuntimeProbeBinding {
  probeId: string;
  predicate: string;
  query: RuntimeProbeQuery;
  outcomeByState: RuntimeProbeOutcomeMap;
  incidentId?: string;
  scope?: RuntimeScope;
}


export interface RuntimeProbeExchange {
  request: RuntimeProbeRequest;
  response: RuntimeProbeResponse;
}

export interface RuntimeProbeTranscript {
  schemaVersion: 1;
  sessionId?: string;
  artifactId?: string;
  droppedExchanges?: number;
  exchanges: readonly RuntimeProbeExchange[];
}


export interface RuntimeProbeBindingSet {
  schemaVersion: 1;
  bindings: readonly RuntimeProbeBinding[];
}


export interface RuntimeProbeRequestBundle {
  schemaVersion: 1;
  sessionId?: string;
  artifactId?: string;
  incidentIds?: readonly string[];
  requests: readonly RuntimeProbeRequest[];
}
