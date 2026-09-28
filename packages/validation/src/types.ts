import type { SourceRef } from "../../project-model/src/index.js";
import type { DiagnosticCode } from "../../diagnostics/src/index.js";

export type ValidationStep =
  | {
      kind: "reparse";
      source: SourceRef;
    }
  | {
      kind: "rebuild-graph";
    }
  | {
      kind: "rerun-diagnostic";
      code: DiagnosticCode;
      source?: SourceRef;
      expectation: "absent";
    }
  | {
      kind: "topology-compare";
      source: SourceRef;
      expectation: "outlier-absent";
    };

export interface ValidationStepResult {
  step: ValidationStep;
  ok: boolean;
  message: string;
}

export interface TransactionValidationResult {
  ok: boolean;
  steps: ValidationStepResult[];
}


export type ValidationProofLevel =
  | "STATIC VERIFIED"
  | "PACKAGE VERIFIED"
  | "LOCAL GAME VERIFIED"
  | "LIVE GAME VERIFIED"
  | "UNKNOWN";

export interface ValidationScenario {
  schemaVersion: 1;
  id: string;
  revision: string;
  title: string;
  description?: string;
  intentInvariantIds: readonly string[];
  steps: readonly ValidationStep[];
  requiredProofLevel: ValidationProofLevel;
}

export interface ValidationScenarioSnapshot {
  schemaVersion: 1;
  scenarioId: string;
  scenarioRevision: string;
  title: string;
  description?: string;
  intentInvariantIds: readonly string[];
  steps: readonly ValidationStep[];
  requiredProofLevel: ValidationProofLevel;
  artifactFingerprint: string;
  intentModelId: string;
  targetProfileFingerprint?: string;
}

export interface ValidationRun {
  schemaVersion: 1;
  id: string;
  snapshot: ValidationScenarioSnapshot;
  result: TransactionValidationResult;
  evidenceIds: readonly string[];
  proofLevel: ValidationProofLevel;
}

export interface ValidationTraceContext {
  artifactFingerprint: string;
  intentModelId: string;
  targetProfileFingerprint?: string;
}

export interface ValidationRunTrace {
  runId: string;
  scenarioId: string;
  scenarioRevision: string;
  intentInvariantIds: readonly string[];
  ok: boolean;
  proofLevel: ValidationProofLevel;
  current: boolean;
  staleReasons: readonly string[];
  evidenceIds: readonly string[];
}

export interface ValidationInvariantTrace {
  invariantId: string;
  scenarioIds: readonly string[];
  runIds: readonly string[];
  currentPassingRunIds: readonly string[];
  current: boolean;
}

export interface ValidationTraceReport {
  runs: readonly ValidationRunTrace[];
  invariants: readonly ValidationInvariantTrace[];
}
