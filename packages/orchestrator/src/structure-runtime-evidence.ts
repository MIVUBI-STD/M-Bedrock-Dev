import type { SourceRef } from "../../project-model/src/source-ref.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
import type { analyzeStructureAndChunkRuntime } from "./structure-runtime-analysis.js";

type StructureRuntimeAnalysis = ReturnType<typeof analyzeStructureAndChunkRuntime>;

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

  return records;
}