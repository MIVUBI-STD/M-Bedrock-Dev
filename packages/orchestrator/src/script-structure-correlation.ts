import type { ParsedScriptFile } from "../../../analyzers/scripts/src/index.js";
import { parseStructureLoadSemantics } from "../../../analyzers/commands/src/index.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/index.js";
import type { SourceRef } from "../../project-model/src/index.js";
import type { ParsedStructureSummary } from "./structure-runtime-analysis.js";

function operationId(source: SourceRef): string {
  return [
    source.artifactId,
    source.relativePath,
    source.range?.lineStart ?? 0,
    source.range?.columnStart ?? 0,
  ].join(":");
}

export interface ScriptStructureLoadCorrelation {
  scriptId: string;
  target: string;
  status: "resolved" | "missing" | "ambiguous";
  source: SourceRef;
  candidates: readonly ParsedStructureSummary[];
}

export function correlateScriptStructureLoads(
  scripts: readonly ParsedScriptFile[],
  structures: readonly ParsedStructureSummary[],
): ScriptStructureLoadCorrelation[] {
  const output: ScriptStructureLoadCorrelation[] = [];

  for (const script of scripts) {
    for (const literal of script.commandLiterals) {
      if (
        literal.mechanism !== "runCommand" &&
        literal.mechanism !== "runCommandAsync"
      ) continue;

      const semantics = parseStructureLoadSemantics(literal.command);
      if (!semantics) continue;

      const candidates = structures.filter(
        (structure) => structure.identifier === semantics.name,
      );
      output.push({
        scriptId: script.identifier,
        target: semantics.name,
        status:
          candidates.length === 0
            ? "missing"
            : candidates.length === 1
              ? "resolved"
              : "ambiguous",
        source: literal.source,
        candidates,
      });
    }
  }

  return output.sort((a, b) =>
    a.scriptId.localeCompare(b.scriptId) ||
    operationId(a.source).localeCompare(operationId(b.source))
  );
}

export function scriptStructureRuntimeEvidence(
  correlations: readonly ScriptStructureLoadCorrelation[],
): RuntimeEvidenceRecord[] {
  return correlations.map((item) => ({
    predicate: "structure-target-resolved",
    state:
      item.status === "resolved"
        ? "present"
        : item.status === "missing"
          ? "absent"
          : "unknown",
    confidence: "observed",
    scope: { operationId: operationId(item.source) },
    sourceRefs: [item.source],
    note:
      "Script structure target " +
      item.target +
      " is " +
      item.status +
      ".",
  }));
}
