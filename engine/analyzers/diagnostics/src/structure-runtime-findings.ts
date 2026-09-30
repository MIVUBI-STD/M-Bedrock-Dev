import { createHash } from "node:crypto";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/index.js";
import type { SourceRef } from "../../../packages/project-model/src/index.js";
import type { StructureRuntimeDiagnosticInput } from "./structure-runtime-types.js";

function idFor(source: SourceRef, suffix: string): string {
  return "diag_" + createHash("sha256")
    .update(`${source.artifactId}:${source.relativePath}:${suffix}`)
    .digest("hex")
    .slice(0, 16);
}

export function structureRuntimeDiagnostics(
  analysis: StructureRuntimeDiagnosticInput,
  sourceByFunction: ReadonlyMap<string, SourceRef>,
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];

  for (const correlation of analysis.correlations) {
    const source = sourceByFunction.get(correlation.load.functionId);
    if (!source) continue;

    if (correlation.status === "missing") {
      findings.push({
        id: idFor(source, `structure-missing:${correlation.load.semantics.name}`),
        code: "STRUCTURE_LOAD_TARGET_MISSING",
        severity: "medium",
        message: `Structure load target ${correlation.load.semantics.name} could not be resolved to a parsed mcstructure.`,
        source,
        data: {
          target: correlation.load.semantics.name,
          line: correlation.load.line ?? null,
        },
      });
      continue;
    }

    if (correlation.status === "ambiguous") {
      findings.push({
        id: idFor(source, `structure-ambiguous:${correlation.load.semantics.name}`),
        code: "STRUCTURE_LOAD_TARGET_AMBIGUOUS",
        severity: "medium",
        message: `Structure load target ${correlation.load.semantics.name} resolves to multiple mcstructure candidates.`,
        source,
        data: {
          target: correlation.load.semantics.name,
          candidates: correlation.candidates.map((item) => item.relativePath),
        },
      });
      continue;
    }

    for (const risk of correlation.findings) {
      const structure = correlation.candidates[0]!;
      if (risk === "entities-excluded") {
        findings.push({
          id: idFor(source, `structure-entities-excluded:${correlation.load.semantics.name}`),
          code: "STRUCTURE_LOAD_CONTENT_EXCLUDED",
          severity: "info",
          message: `Structure ${correlation.load.semantics.name} contains entities, but this load explicitly excludes entities.`,
          source,
          data: {
            target: correlation.load.semantics.name,
            entityCount: structure.semantics.entityCount,
            excluded: "entities",
          },
        });
      }

      if (risk === "blocks-excluded") {
        findings.push({
          id: idFor(source, `structure-blocks-excluded:${correlation.load.semantics.name}`),
          code: "STRUCTURE_LOAD_CONTENT_EXCLUDED",
          severity: "info",
          message: `Structure ${correlation.load.semantics.name} contains block palette data, but this load explicitly excludes blocks.`,
          source,
          data: {
            target: correlation.load.semantics.name,
            paletteSize: structure.semantics.paletteSize,
            excluded: "blocks",
          },
        });
      }

      if (
        risk === "probabilistic-command-block-load" ||
        risk === "probabilistic-container-load"
      ) {
        findings.push({
          id: idFor(source, `structure-probabilistic:${correlation.load.semantics.name}:${risk}`),
          code: "STRUCTURE_LOAD_PROBABILISTIC_RUNTIME_CONTENT",
          severity: "medium",
          message: `Structure ${correlation.load.semantics.name} uses integrity below 100 while containing runtime-significant block content.`,
          source,
          data: {
            target: correlation.load.semantics.name,
            integrity: correlation.load.semantics.integrity ?? null,
            risk,
            commandBlockPaletteEntries: structure.semantics.commandBlockPaletteEntries,
            containerPaletteEntries: structure.semantics.containerPaletteEntries,
          },
        });
      }
    }
  }

  if (
    analysis.runtimeLogicStructureLoads > 0 &&
    analysis.chunkLifecycleEvidence.tickingAreas === 0 &&
    analysis.chunkLifecycleEvidence.areaLoadedSchedules === 0
  ) {
    const first = analysis.correlations.find(
      (item) => item.findings.includes("runtime-logic-content"),
    );
    const source = first
      ? sourceByFunction.get(first.load.functionId)
      : undefined;
    if (source) {
      findings.push({
        id: idFor(source, "structure-runtime-chunk-lifecycle-unproven"),
        code: "CHUNK_LIFECYCLE_RUNTIME_RISK",
        severity: "info",
        message: "Structure-loaded runtime logic is present, but no tickingarea or schedule on_area_loaded evidence was found in analyzed functions.",
        source,
        data: {
          runtimeLogicStructureLoads: analysis.runtimeLogicStructureLoads,
          limitation: "Static analysis cannot prove player proximity or world-level ticking coverage.",
        },
      });
    }
  }

  return findings;
}
