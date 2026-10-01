import {
  shortestDataFlowTaintWitness,
  type DataFlowGraph,
} from "../../../../packages/dataflow/src/index.js";
import type {
  ScriptSemanticFlowBinding,
  ScriptSemanticFlowLabel,
} from "./semantic-flow-bindings.js";

export interface ScriptSemanticFlowWitness {
  label: ScriptSemanticFlowLabel;
  sourceNodeId: string;
  sinkNodeId: string;
  edgeIds: readonly string[];
  sourceBasis: string;
  sinkBasis: string;
  confidence: "exact" | "bounded";
}

export interface ScriptSemanticFlowWitnessResult {
  witnesses: readonly ScriptSemanticFlowWitness[];
  sourceBindings: number;
  sinkBindings: number;
  attemptedPairs: number;
  omittedPairs: number;
}

function positive(
  value: number | undefined,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("maxPairs must be a positive integer.");
  }
  return value;
}

export function deriveScriptSemanticFlowWitnesses(
  graph: DataFlowGraph,
  bindings: readonly ScriptSemanticFlowBinding[],
  options: {
    maxPairs?: number;
    barrierNodeIds?: readonly string[];
  } = {},
): ScriptSemanticFlowWitnessResult {
  const maxPairs = positive(options.maxPairs, 256);
  const barriers = options.barrierNodeIds ?? [];
  const sources = bindings.filter(
    (item) => item.role === "source",
  );
  const sinks = bindings.filter(
    (item) => item.role === "sink",
  );
  const witnesses: ScriptSemanticFlowWitness[] = [];
  let attemptedPairs = 0;
  let omittedPairs = 0;

  const labels = [
    ...new Set(bindings.map((item) => item.label)),
  ].sort();

  outer:
  for (const label of labels) {
    const labelSources = sources
      .filter((item) => item.label === label)
      .sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    const labelSinks = sinks
      .filter((item) => item.label === label)
      .sort((a, b) => a.nodeId.localeCompare(b.nodeId));

    for (const source of labelSources) {
      for (const sink of labelSinks) {
        if (attemptedPairs >= maxPairs) {
          omittedPairs =
            labelSources.length * labelSinks.length -
            attemptedPairs;
          break outer;
        }
        attemptedPairs += 1;

        const witness =
          shortestDataFlowTaintWitness(
            graph,
            {
              nodeId: source.nodeId,
              label,
            },
            sink.nodeId,
            barriers,
          );
        if (!witness) continue;

        witnesses.push({
          label,
          sourceNodeId: source.nodeId,
          sinkNodeId: sink.nodeId,
          edgeIds: witness.edgeIds,
          sourceBasis: source.basis,
          sinkBasis: sink.basis,
          confidence:
            source.confidence === "exact" &&
            sink.confidence === "exact"
              ? "exact"
              : "bounded",
        });
      }
    }
  }

  return {
    witnesses: witnesses.sort((a, b) =>
      a.label.localeCompare(b.label) ||
      a.sourceNodeId.localeCompare(b.sourceNodeId) ||
      a.sinkNodeId.localeCompare(b.sinkNodeId)
    ),
    sourceBindings: sources.length,
    sinkBindings: sinks.length,
    attemptedPairs,
    omittedPairs,
  };
}
