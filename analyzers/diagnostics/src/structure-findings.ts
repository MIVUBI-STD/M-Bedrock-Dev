import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type { McStructureModel } from "../../../adapters/mcstructure/src/index.js";
import { validateStructureLayerLengths } from "../../../adapters/mcstructure/src/index.js";
import { createDiagnostic } from "../../../packages/diagnostics/src/create.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";

export function structureParseFailedDiagnostic(
  source: SourceRef,
  error: unknown,
): DiagnosticFinding {
  return createDiagnostic({
    code: "STRUCTURE_PARSE_FAILED",
    severity: "medium",
    message: "Unable to parse mcstructure as Bedrock little-endian NBT.",
    source,
    data: {
      error: error instanceof Error ? error.message : String(error),
    },
  });
}

export function structureInvariantDiagnostics(
  structure: McStructureModel,
  source: SourceRef,
): DiagnosticFinding[] {
  const layerLengths = validateStructureLayerLengths(structure);
  if (layerLengths.ok) return [];

  return [createDiagnostic({
    code: "STRUCTURE_LAYER_LENGTH_MISMATCH",
    severity: "medium",
    message: "mcstructure block index layer length does not match the declared structure volume.",
    source,
    data: {
      expected: layerLengths.expected ?? null,
      invalidLayers: layerLengths.invalidLayers,
      size: structure.size ?? null,
    },
  })];
}
