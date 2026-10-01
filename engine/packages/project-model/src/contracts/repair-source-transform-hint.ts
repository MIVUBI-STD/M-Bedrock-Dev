import type { SourceRef } from "../project/source-ref.js";

export type RepairSourceTransformFamily =
  | "session-generation-guard"
  | "scheduler-generation-guard"
  | "arena-ownership-guard"
  | "arena-capacity-guard"
  | "persistence-idempotency-guard"
  | "compatibility-transform";

export interface RepairSourceTransformHint {
  schemaVersion: 1;
  id: string;
  family: RepairSourceTransformFamily;
  analyzerId: string;
  analyzerRevision: string;
  parserId: string;
  parserRevision: string;
  semanticOwnerId: string;
  source: SourceRef;
  expectedText: string;
  replacementText: string;
  supportedPredicateIds: readonly string[];
  supportedFactorIds: readonly string[];
  validationKinds: readonly (
    | "reparse"
    | "rebuild-graph"
    | "rerun-diagnostic"
  )[];
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function validateRepairSourceTransformHint(
  hint: RepairSourceTransformHint,
): string[] {
  const errors: string[] = [];

  if (hint.schemaVersion !== 1) {
    errors.push(
      "Repair source transform hint schemaVersion must be 1.",
    );
  }
  for (const [field, value] of [
    ["id", hint.id],
    ["analyzerId", hint.analyzerId],
    ["analyzerRevision", hint.analyzerRevision],
    ["parserId", hint.parserId],
    ["parserRevision", hint.parserRevision],
    ["semanticOwnerId", hint.semanticOwnerId],
    ["expectedText", hint.expectedText],
    ["replacementText", hint.replacementText],
  ] as const) {
    if (!nonEmpty(value)) {
      errors.push(
        "Repair source transform hint " +
          field +
          " must be non-empty.",
      );
    }
  }

  const range = hint.source.range;
  if (
    range?.lineStart === undefined ||
    range.lineEnd === undefined ||
    range.lineStart !== range.lineEnd
  ) {
    errors.push(
      "Repair source transform hint requires exact single-line source evidence.",
    );
  }

  if (hint.expectedText === hint.replacementText) {
    errors.push(
      "Repair source transform hint replacement must change the source text.",
    );
  }

  if (hint.supportedPredicateIds.length === 0) {
    errors.push(
      "Repair source transform hint must declare at least one supported causal predicate.",
    );
  }
  if (hint.supportedFactorIds.length === 0) {
    errors.push(
      "Repair source transform hint must declare at least one supported controlled factor.",
    );
  }
  if (hint.validationKinds.length === 0) {
    errors.push(
      "Repair source transform hint must declare at least one validation kind.",
    );
  }

  for (const field of [
    hint.supportedPredicateIds,
    hint.supportedFactorIds,
  ]) {
    const seen = new Set<string>();
    for (const value of field) {
      if (!nonEmpty(value)) {
        errors.push(
          "Repair source transform hint predicate/factor ids must be non-empty.",
        );
      }
      if (seen.has(value)) {
        errors.push(
          "Repair source transform hint contains duplicate predicate/factor id: " +
            value +
            ".",
        );
      }
      seen.add(value);
    }
  }

  return errors;
}
