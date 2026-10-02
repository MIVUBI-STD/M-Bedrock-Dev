import type {
  GameplayIntentModel,
  GameplayIntentNodeKind,
} from "./types.js";

export type GameplayClosureStatus =
  | "CLOSED"
  | "PARTIAL"
  | "OPEN";

export type GameplaySurfaceClosureStatus =
  | "understood"
  | "blocked"
  | "unknown"
  | "not-applicable";

export interface GameplayClosureSurface {
  readonly id: string;
  readonly label: string;
  readonly kind: GameplayIntentNodeKind | "runtime-domain";
  readonly status: GameplaySurfaceClosureStatus;
  readonly material: boolean;
  readonly reason?: string;
  readonly evidenceIds?: readonly string[];
  readonly boundaries?: readonly string[];
}

export interface GameplayModelClosureInput {
  readonly discoveredSurfaceIds: readonly string[];
  readonly surfaces: readonly GameplayClosureSurface[];
  readonly stateModelComplete: boolean;
  readonly boundariesExtracted: boolean;
}

export interface GameplayModelClosureResult {
  readonly status: GameplayClosureStatus;
  readonly surfaces: readonly GameplayClosureSurface[];
  readonly unaccountedSurfaceIds: readonly string[];
  readonly blockingSurfaceIds: readonly string[];
  readonly unknownSurfaceIds: readonly string[];
  readonly stateModelComplete: boolean;
  readonly boundariesExtracted: boolean;
  readonly reasons: readonly string[];
}

export function buildIntentClosureSurfaces(
  model: GameplayIntentModel,
): readonly GameplayClosureSurface[] {
  const unknownBySubject = new Map<string, string[]>();

  for (const unknown of model.unknowns) {
    for (const subjectId of unknown.blockedSubjectIds) {
      const list = unknownBySubject.get(subjectId) ?? [];
      list.push(unknown.id);
      unknownBySubject.set(subjectId, list);
    }
  }

  return model.nodes.map((node) => {
    const unknownIds = unknownBySubject.get(node.id) ?? [];
    const status: GameplaySurfaceClosureStatus =
      unknownIds.length > 0 || node.status === "hypothesis"
        ? "unknown"
        : "understood";

    return {
      id: node.id,
      label: node.label,
      kind: node.kind,
      status,
      material:
        node.kind === "game" ||
        node.kind === "mechanic" ||
        node.kind === "objective" ||
        node.kind === "phase" ||
        node.kind === "state" ||
        node.kind === "lifecycle" ||
        node.kind === "outcome" ||
        node.kind === "resource" ||
        node.kind === "spatial-region" ||
        node.kind === "policy",
      ...(unknownIds.length === 0
        ? {}
        : {
            reason:
              "Gameplay intent remains unresolved: " +
              unknownIds.join(", "),
          }),
      evidenceIds: [...node.evidenceIds],
    };
  });
}

export function assessGameplayModelClosure(
  input: GameplayModelClosureInput,
): GameplayModelClosureResult {
  const accounted = new Set(input.surfaces.map((surface) => surface.id));
  const unaccountedSurfaceIds = [...new Set(input.discoveredSurfaceIds)]
    .filter((id) => !accounted.has(id))
    .sort();

  const blockingSurfaceIds = input.surfaces
    .filter(
      (surface) =>
        surface.material &&
        surface.status === "blocked",
    )
    .map((surface) => surface.id)
    .sort();

  const unknownSurfaceIds = input.surfaces
    .filter(
      (surface) =>
        surface.material &&
        surface.status === "unknown",
    )
    .map((surface) => surface.id)
    .sort();

  const reasons: string[] = [];

  if (unaccountedSurfaceIds.length > 0) {
    reasons.push(
      "One or more discovered gameplay surfaces are not accounted for.",
    );
  }

  if (!input.stateModelComplete) {
    reasons.push(
      "The major gameplay state/transition model is incomplete.",
    );
  }

  if (!input.boundariesExtracted) {
    reasons.push(
      "Material gameplay boundaries or limits are not fully extracted.",
    );
  }

  if (blockingSurfaceIds.length > 0) {
    reasons.push(
      "One or more material gameplay surfaces are blocked from analysis.",
    );
  }

  if (unknownSurfaceIds.length > 0) {
    reasons.push(
      "One or more material gameplay surfaces remain unknown.",
    );
  }

  const status: GameplayClosureStatus =
    unaccountedSurfaceIds.length > 0 ||
    !input.stateModelComplete
      ? "OPEN"
      : (
          !input.boundariesExtracted ||
          blockingSurfaceIds.length > 0 ||
          unknownSurfaceIds.length > 0
        )
        ? "PARTIAL"
        : "CLOSED";

  if (status === "CLOSED") {
    reasons.push(
      "All discovered gameplay surfaces are accounted for and the material gameplay model is closed enough for comprehensive contradiction analysis.",
    );
  }

  return {
    status,
    surfaces: [...input.surfaces],
    unaccountedSurfaceIds,
    blockingSurfaceIds,
    unknownSurfaceIds,
    stateModelComplete: input.stateModelComplete,
    boundariesExtracted: input.boundariesExtracted,
    reasons,
  };
}
