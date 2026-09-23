import type { SourceRef } from "../../project-model/src/source-ref.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
import type { analyzeStructureAndChunkRuntime } from "./structure-runtime-analysis.js";
import type { derivePlacementProofs } from "./structure-proof-analysis.js";

type StructureRuntimeAnalysis = ReturnType<typeof analyzeStructureAndChunkRuntime>;
type StructurePlacementProofs = ReturnType<typeof derivePlacementProofs>;

function lineSource(source: SourceRef, line: number | undefined): SourceRef {
  if (line === undefined) return source;
  return { ...source, range: { lineStart: line, lineEnd: line } };
}

function operationId(source: SourceRef): string {
  return source.artifactId + ":" + source.relativePath + ":" + (source.range?.lineStart ?? 0);
}

export function structureRuntimeEvidence(
  analysis: StructureRuntimeAnalysis,
  sourceByFunction: ReadonlyMap<string, SourceRef>,
  proofs?: StructurePlacementProofs,
): RuntimeEvidenceRecord[] {
  const records: RuntimeEvidenceRecord[] = [];

  for (const correlation of analysis.correlations) {
    const base = sourceByFunction.get(correlation.load.functionId);
    if (!base) continue;
    const source = lineSource(base, correlation.load.line);
    const scope = { operationId: operationId(source) };

    records.push({
      predicate: "structure-target-resolved",
      state: correlation.status === "resolved"
        ? "present"
        : correlation.status === "missing" ? "absent" : "unknown",
      confidence: "observed",
      scope,
      sourceRefs: [source],
      note: "Target " + correlation.load.semantics.name + " is " + correlation.status + ".",
    });

    for (const finding of correlation.findings) {
      records.push({
        predicate: "structure-correlation:" + finding,
        state: "present",
        confidence: "derived",
        scope,
        sourceRefs: [source],
      });
    }
  }

  for (const item of analysis.tickingAreas) {
    const base = sourceByFunction.get(item.functionId);
    if (!base) continue;
    const source = lineSource(base, item.line);
    records.push({
      predicate: "chunk-readiness-mechanism",
      state: "present",
      confidence: "observed",
      scope: { operationId: operationId(source) },
      sourceRefs: [source],
      note: "tickingarea " + item.tickingArea.action,
    });
  }

  for (const item of analysis.areaLoadedSchedules) {
    const base = sourceByFunction.get(item.functionId);
    if (!base) continue;
    const source = lineSource(base, item.line);
    records.push({
      predicate: "area-loaded-schedule",
      state: "present",
      confidence: "observed",
      scope: { operationId: operationId(source) },
      sourceRefs: [source],
    });
  }

  for (const item of analysis.absoluteLoadDestinations) {
    const base = sourceByFunction.get(item.functionId);
    if (!base) continue;
    const source = lineSource(base, item.line);
    records.push({
      predicate: "absolute-structure-destination",
      state: "present",
      confidence: "derived",
      scope: { operationId: operationId(source) },
      sourceRefs: [source],
      note: "chunk=" + item.chunkX + "," + item.chunkZ,
    });
  }

  for (const proof of proofs?.postPlacementVerifications ?? []) {
    const base = sourceByFunction.get(proof.functionId);
    if (!base) continue;
    const source = lineSource(base, proof.loadLine);
    records.push({
      predicate: "post-placement-readiness-verification",
      state: "present",
      confidence: "derived",
      scope: { operationId: operationId(source) },
      sourceRefs: [source],
      note:
        proof.mechanism +
        " verifies " +
        proof.expectedBlock +
        " at line " +
        (proof.verificationLine ?? "?"),
    });
  }

  for (const proof of proofs?.areaLoadedCoverage ?? []) {
    const base = sourceByFunction.get(proof.functionId);
    if (!base) continue;
    const source = lineSource(base, proof.loadLine);
    records.push({
      predicate: "loaded-target-chunk",
      state: "present",
      confidence: "derived",
      scope: { operationId: operationId(source) },
      sourceRefs: [source],
      note:
        "schedule on_area_loaded (" +
        proof.scheduleKind +
        ") covers the full structure chunk bounds.",
    });
    records.push({
      predicate: "mutation-chunk-coverage-proven",
      state: "present",
      confidence: "derived",
      scope: { operationId: operationId(source) },
      sourceRefs: [source],
    });
  }

  for (const [key, bounds] of proofs?.bounds ?? []) {
    const split = key.lastIndexOf(":");
    const functionId = split >= 0 ? key.slice(0, split) : key;
    const line = split >= 0 ? Number(key.slice(split + 1)) : undefined;
    const base = sourceByFunction.get(functionId);
    if (!base) continue;
    const source = lineSource(base, Number.isFinite(line) ? line : undefined);
    records.push({
      predicate: "transformed-mutation-bounds-known",
      state: "present",
      confidence: "derived",
      scope: { operationId: operationId(source) },
      sourceRefs: [source],
      note:
        "chunks=" +
        bounds.minChunkX +
        "," +
        bounds.minChunkZ +
        ".." +
        bounds.maxChunkX +
        "," +
        bounds.maxChunkZ,
    });
  }

  return records;
}