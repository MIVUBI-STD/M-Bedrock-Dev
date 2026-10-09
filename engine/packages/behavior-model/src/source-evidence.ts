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
  /** Later writes to the same authored surface that may supersede a candidate.
   * Includes unknown-location writes in the same region/document, not assumed absent. */
  readonly intermediateMutationOperationIds: readonly string[];
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
  if (!hasOrderedPosition(write) || !hasOrderedPosition(outcome)) return false;
  const end = write.range!;
  const start = outcome.range!;
  return end.lineEnd! < start.lineStart! ||
    (end.lineEnd === start.lineStart &&
      end.columnEnd! <= start.columnStart!);
}

/** Missing position is not evidence that a mutation cannot intervene. */
function hasOrderedPosition(source: SourceRef): boolean {
  const range = source.range;
  return range?.lineStart !== undefined &&
    range.lineEnd !== undefined &&
    range.columnStart !== undefined &&
    range.columnEnd !== undefined;
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

/** Exactly opposing branches of one identified source guard cannot both run
 * in the same evaluation. Textually similar guards at different sites are
 * NOT considered mutually exclusive (values may have changed). */
function mutuallyExclusiveGuards(
  a: {
    lexicalGuards?: readonly AuthoredBranchGuard[];
    precedenceGuards?: readonly AuthoredBranchGuard[];
  },
  b: {
    lexicalGuards?: readonly AuthoredBranchGuard[];
    precedenceGuards?: readonly AuthoredBranchGuard[];
  },
): boolean {
  const left = [...(a.lexicalGuards ?? []), ...(a.precedenceGuards ?? [])];
  const right = [...(b.lexicalGuards ?? []), ...(b.precedenceGuards ?? [])];
  return left.some(one => right.some(two => {
    const x = one.source.range;
    const y = two.source.range;
    return one.branch !== two.branch &&
      one.expression === two.expression &&
      sameDocument(one.source, two.source) &&
      x?.lineStart !== undefined && x.columnStart !== undefined &&
      x.lineEnd !== undefined && x.columnEnd !== undefined &&
      x.lineStart === y?.lineStart &&
      x.columnStart === y?.columnStart &&
      x.lineEnd === y?.lineEnd &&
      x.columnEnd === y?.columnEnd;
  }));
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
      // An intermediate mutation of the same surface can invalidate a naive
      // state-at-return inference. Do not assume different branches are
      // exclusive across time, and do not discard imprecisely located writes.
      const candidateIds = new Set(ids);
      const interruptions = writes.filter(other =>
        !candidateIds.has(other.id) &&
        other.executionRegionId === outcome.executionRegionId &&
        sameDocument(other.source, outcome.source) &&
        candidates.some(candidate =>
          candidate.surfaceId === other.surfaceId &&
          !mutuallyExclusiveGuards(candidate, other) &&
          (
            !hasOrderedPosition(other.source) ||
            (precedingSourceWrite(candidate.source, other.source) &&
              precedingSourceWrite(other.source, outcome.source))
          ))
      ).map(item => item.id);
      // Multiple writes to the same surface within matching authored
      // branches also prohibit claiming one stable value at return.
      const repeated = candidates.filter(candidate =>
        candidates.some(other => other.id !== candidate.id &&
          other.surfaceId === candidate.surfaceId));
      const intermediateMutationOperationIds = [
        ...new Set([...interruptions, ...repeated.map(item => item.id)]),
      ].sort();
      const status = ids.length > 0 &&
        intermediateMutationOperationIds.length === 0
        ? "SOURCE_ORDER_CANDIDATE" as const
        : "UNRESOLVED" as const;
      return {
        outcomeId: outcome.id,
        executionRegionId: outcome.executionRegionId,
        propertyName: outcome.propertyName,
        value: outcome.value,
        precedingWriteOperationIds: ids,
        intermediateMutationOperationIds,
        status,
        reason: intermediateMutationOperationIds.length > 0
          ? "Intermediate or repeated writes to the same authored state surface may change its value before this return. Source order alone cannot establish the effective state, instance identity or lifetime."
          : ids.length > 0
          ? "Authored writes precede this return under matching source branch evidence. The value's actual lifetime, state owner, runtime path and causal connection to the outcome are unknown."
          : "No source-ordered write with exact same-region, same-document and branch evidence was identified; the outcome's state dependency and lifetime are unknown.",
        provenance: {
          kind: "source-inference" as const,
          evidenceCeiling: "inferred" as const,
          evidenceIds: [outcome.id, ...new Set([...ids, ...intermediateMutationOperationIds])].sort(),
          note: "Static source association only; never an executable BehaviorTransition or gameplay completion claim.",
        },
      };
    });
}
