import type { SourceRef } from "../../project-model/src/index.js";
import type { ValidationStep } from "../../validation/src/index.js";

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

export interface PatchTransaction {
  id: string;
  title: string;
  sourceFingerprint: string;
  operations: PatchOperation[];
  preconditions: PatchPrecondition[];
  validation: ValidationStep[];
  affectedPaths: string[];
}

export type PatchTransactionInput = Omit<PatchTransaction, "id" | "affectedPaths">;
