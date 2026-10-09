import type { AuthoredBranchGuard, SemanticIr } from "../../semantic-ir/src/index.js";
import type { SourceRef } from "../../project-model/src/index.js";
import type { BehaviorClaimProvenance } from "./provenance.js";

/**
 * This is a bounded source-evidence reconciliation, NOT a BehaviorTransition.
 * A source-ordered write may never execute, and a returned literal is not a
 * player-visible terminal outcome.
 */
export interface SourceStateOutcomeCandidate {
  readonly outcomeId: string;
  readonly executionRegionId: string;
  readonly propertyName: string;
  readonly value: string;
  readonly precedingWriteOperationIds: readonly string[];
  readonly status: "SOURCE_ORDER_CANDIDATE" | "UNRESOLVED";
  readonly reason: string;
  readonly provenance: BehaviorClaimProvenance;
}

function sameDocument(a: SourceRef, b: SourceRef): boolean {
  return a.artifactId === b.artifactId &&
    a.relativePath === b.relativePath &&
    a.jsonPointer === b.jsonPointer;
}

function precedingSourceWrite(
  write: SourceRef,
  outcome: SourceRef,
): boolean {
  if (!sameDocument(write, outcome)) return false;
  const end = write.range;
  const start = outcome.range;
  if (end?.lineEnd === undefined || end.columnEnd === undefined ||
      start?.lineStart === undefined || start.columnStart === undefined) {
    return false;
  }
  return end.lineEnd < start.lineStart ||
    (end.lineEnd === start.lineStart &&
      end.columnEnd <= start.columnStart);
}

function guardsEqual(
  a?: readonly AuthoredBranchGuard[],
  b?: readonly AuthoredBranchGuard[],
): boolean {
  const signature = (guards?: readonly AuthoredBranchGuard[]) =>
    JSON.stringify((guards ?? []).map(guard => {
      const range = guard.source.range;
      // Without exact source coordinates, a condition is insufficient to
      // establish that two records describe the same authored branch.
      if (!range || range.lineStart === undefined ||
          range.columnStart === undefined ||
          range.lineEnd === undefined ||
          range.columnEnd === undefined) return null;
      return [
        guard.source.artifactId, guard.source.relativePath,
        guard.source.jsonPointer ?? null,
        range.lineStart, range.columnStart, range.lineEnd, range.columnEnd,
        guard.expression, guard.branch,
      ];
    }));
  if ((a ?? []).some(g => !g.source.range) ||
      (b ?? []).some(g => !g.source.range)) return false;
  const valid = (guards?: readonly AuthoredBranchGuard[]) =>
    (guards ?? []).every(g => g.source.range?.lineStart !== undefined &&
      g.source.range?.columnStart !== undefined &&
      g.source.range?.lineEnd !== undefined &&
      g.source.range?.columnEnd !== undefined);
  return valid(a) && valid(b) && signature(a) === signature(b);
}

/**
 * Collect source-ordered writes preceding each authored return in the SAME
 * execution region and on the SAME observed lexical/precedence guard arms.
 * Does not imply dataflow, runtime order, scope identity, or game success.
 * Unmatched returns stay explicitly visible rather than silently disappearing.
 */
export function reconcileSourceStateOutcomes(
  ir: SemanticIr,
): readonly SourceStateOutcomeCandidate[] {
  const writes = ir.state.operations.filter(operation =>
    operation.operation === "write" && operation.writtenValue !== undefined);
  return [...(ir.execution.outcomes ?? [])]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(outcome => {
      const candidates = writes.filter(write =>
        write.executionRegionId === outcome.executionRegionId &&
        precedingSourceWrite(write.source, outcome.source) &&
        guardsEqual(write.lexicalGuards, outcome.lexicalGuards) &&
        guardsEqual(write.precedenceGuards, outcome.precedenceGuards));
      const ids = [...new Set(candidates.map(item => item.id))].sort();
      const status = ids.length > 0
        ? "SOURCE_ORDER_CANDIDATE" as const
        : "UNRESOLVED" as const;
      return {
        outcomeId: outcome.id,
        executionRegionId: outcome.executionRegionId,
        propertyName: outcome.propertyName,
        value: outcome.value,
        precedingWriteOperationIds: ids,
        status,
        reason: ids.length > 0
          ? "Authored writes precede this return in one execution region with matching source branch evidence. Runtime path and causal state-to-outcome linkage remain unknown."
          : "No source-ordered write with exact same-region, same-document and branch evidence was identified; the outcome's state dependency is unknown.",
        provenance: {
          kind: "source-inference" as const,
          evidenceCeiling: "inferred" as const,
          evidenceIds: [outcome.id, ...ids],
          note: "Static source association only; never an executable BehaviorTransition or gameplay completion claim.",
        },
      };
    });
}
