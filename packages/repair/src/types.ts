import type { SourceRef } from "../../project-model/src/source-ref.js";

export type PatchOperation =
  | {
      kind: "replace-text";
      source: SourceRef;
      expected: string;
      replacement: string;
    }
  | {
      kind: "replace-command";
      source: SourceRef;
      expected: string;
      replacement: string;
    };

export interface PatchPrecondition {
  kind: "source-fingerprint" | "text-equals";
  source?: SourceRef;
  expected: string;
}

export interface ValidationStep {
  kind: "reparse" | "rebuild-graph" | "rerun-diagnostic" | "topology-compare";
  target?: string;
}

export interface PatchTransaction {
  id: string;
  title: string;
  sourceFingerprint: string;
  operations: PatchOperation[];
  preconditions: PatchPrecondition[];
  validation: ValidationStep[];
  affectedPaths: string[];
}
