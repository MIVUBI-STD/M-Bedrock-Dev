import type { SemanticGraph } from "../../graph/src/index.js";
import type { SourceRef } from "../../project-model/src/index.js";
import type { PatchTransaction } from "../../repair/src/index.js";

function rangeOverlaps(
  left: SourceRef["range"],
  right: SourceRef["range"],
): boolean {
  if (left === undefined || right === undefined) return true;
  const leftStart = left.lineStart;
  const leftEnd = left.lineEnd;
  const rightStart = right.lineStart;
  const rightEnd = right.lineEnd;

  if (
    leftStart === undefined ||
    leftEnd === undefined ||
    rightStart === undefined ||
    rightEnd === undefined
  ) {
    return true;
  }

  return leftStart <= rightEnd && rightStart <= leftEnd;
}

export function sourceRefMatchesSemanticNode(
  operationSource: SourceRef,
  nodeSource: SourceRef,
): boolean {
  if (
    operationSource.artifactId !== nodeSource.artifactId ||
    operationSource.relativePath !== nodeSource.relativePath
  ) {
    return false;
  }

  if (
    operationSource.jsonPointer !== undefined &&
    nodeSource.jsonPointer !== undefined &&
    operationSource.jsonPointer !== nodeSource.jsonPointer
  ) {
    return false;
  }

  return rangeOverlaps(
    operationSource.range,
    nodeSource.range,
  );
}

export interface ChangedSemanticNodeDerivation {
  changedNodeIds: readonly string[];
  unmatchedOperationPaths: readonly string[];
}

export function deriveChangedSemanticNodeIds(
  graph: SemanticGraph,
  transaction: PatchTransaction,
): ChangedSemanticNodeDerivation {
  const nodes = graph.allNodes();
  const changed = new Set<string>();
  const unmatched: string[] = [];

  for (const operation of transaction.operations) {
    const matches = nodes.filter((node) =>
      sourceRefMatchesSemanticNode(
        operation.source,
        node.source,
      )
    );

    if (matches.length === 0) {
      unmatched.push(operation.source.relativePath);
      continue;
    }

    for (const node of matches) changed.add(node.id);
  }

  return {
    changedNodeIds: [...changed].sort(),
    unmatchedOperationPaths:
      [...new Set(unmatched)].sort(),
  };
}
