import { createHash } from "node:crypto";
import {
  parseScriptFile,
} from "../../../analyzers/scripts/src/index.js";
import type {
  SourceRef,
} from "../../project-model/src/index.js";
import {
  buildInspectionSemanticIr,
} from "./semantic-ir-stage.js";

export interface ScriptTransformSemanticImpactProof {
  status: "proven" | "blocked";
  beforeFingerprint?: string;
  afterFingerprint?: string;
  proofFingerprint?: string;
  reasons: readonly string[];
}

function canonical(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (
    value !== null &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.entries(
        value as Record<string, unknown>,
      )
        .sort(([a], [b]) =>
          a.localeCompare(b)
        )
        .map(([key, child]) => [
          key,
          canonical(child),
        ]),
    );
  }
  return value;
}

function fingerprint(value: unknown): string {
  return createHash("sha256")
    .update(
      JSON.stringify(canonical(value)),
    )
    .digest("hex");
}

function structuralProjection(
  identifier: string,
  text: string,
  source: SourceRef,
): unknown {
  const parsed = parseScriptFile(
    identifier,
    text,
    source,
  );
  const ir = buildInspectionSemanticIr({
    parsedScripts: [{ parsed }],
    parsedFunctions: [],
  });

  return {
    executionRegions:
      ir.execution.regions.map((region) => ({
        id: region.id,
        kind: region.kind,
        ownerId: region.ownerId,
        label: region.label,
        source: region.source ?? null,
      })),
    executionEdges:
      ir.execution.edges.map((edge) => ({
        id: edge.id,
        from: edge.from,
        kind: edge.kind,
        targetLabel: edge.targetLabel,
        resolution: edge.resolution,
        to: edge.to ?? null,
        source: edge.source,
        scheduler: edge.scheduler ?? null,
      })),
    stateSurfaces:
      ir.state.surfaces.map((surface) => ({
        id: surface.id,
        ref: surface.ref,
      })),
    stateOperations:
      ir.state.operations.map((operation) => ({
        id: operation.id,
        executionRegionId:
          operation.executionRegionId,
        surfaceId: operation.surfaceId,
        operation: operation.operation,
        source: operation.source,
        targetHint:
          operation.targetHint ?? null,
      })),
    authorityBindings:
      ir.state.authorityBindings.map(
        (binding) => ({
          contract: binding.contract,
          authoritySurfaceId:
            binding.authoritySurfaceId,
          mirrorSurfaceIds:
            [...binding.mirrorSurfaceIds].sort(),
        }),
      ),
    temporalRelations:
      ir.temporal.relations.map((relation) => ({
        id: relation.id,
        from: relation.from,
        targetLabel: relation.targetLabel,
        resolution: relation.resolution,
        to: relation.to ?? null,
        kind: relation.kind,
        source: relation.source,
      })),
  };
}

export function proveScriptTransformSemanticImpact(
  identifier: string,
  originalText: string,
  transformedText: string,
  source: SourceRef,
): ScriptTransformSemanticImpactProof {
  let before: unknown;
  let after: unknown;

  try {
    before = structuralProjection(
      identifier,
      originalText,
      source,
    );
    after = structuralProjection(
      identifier,
      transformedText,
      source,
    );
  } catch (error) {
    return {
      status: "blocked",
      reasons: [
        "Semantic impact proof could not build comparable pre/post Semantic IR: " +
          String(error),
      ],
    };
  }

  const beforeFingerprint =
    fingerprint(before);
  const afterFingerprint =
    fingerprint(after);

  if (beforeFingerprint !== afterFingerprint) {
    return {
      status: "blocked",
      beforeFingerprint,
      afterFingerprint,
      reasons: [
        "Post-transform Semantic IR changed outside guard metadata; execution/state topology is not structurally equivalent.",
      ],
    };
  }

  return {
    status: "proven",
    beforeFingerprint,
    afterFingerprint,
    proofFingerprint:
      fingerprint({
        identifier,
        source,
        beforeFingerprint,
        afterFingerprint,
      }),
    reasons: [
      "Pre/post transformed source preserves execution regions, execution edges, state surfaces, state operations, authority bindings, and temporal topology.",
    ],
  };
}
