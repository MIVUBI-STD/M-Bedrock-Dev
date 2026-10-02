import type {
  AnalysisKnowledgeDomain,
} from "../../../analysis-planner/src/index.js";
import type {
  GameplayIntentModel,
} from "../../../gameplay-intent/src/index.js";
import type {
  ParsedScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import type {
  InspectTargetProfile,
} from "../types.js";

export interface PreflightKnowledgeDemandInput {
  readonly intent?: GameplayIntentModel;
  readonly scripts: readonly ParsedScriptFile[];
  readonly entityCount: number;
  readonly target: InspectTargetProfile;
}

function hasAny<T>(
  scripts: readonly ParsedScriptFile[],
  select: (script: ParsedScriptFile) => readonly T[] | undefined,
): boolean {
  return scripts.some(
    (script) => (select(script)?.length ?? 0) > 0,
  );
}

export function derivePreflightKnowledgeDemand(
  input: PreflightKnowledgeDemandInput,
): readonly AnalysisKnowledgeDomain[] {
  const domains = new Set<AnalysisKnowledgeDomain>([
    "state-flow",
  ]);
  const nodes = input.intent?.nodes ?? [];
  const edges = input.intent?.edges ?? [];

  const hasActor =
    input.entityCount > 0 ||
    nodes.some(
      (node) =>
        node.kind === "actor" ||
        node.kind === "role",
    );
  const hasSpatial =
    nodes.some(
      (node) => node.kind === "spatial-region",
    );
  const hasResource =
    nodes.some(
      (node) => node.kind === "resource",
    );

  if (
    hasAny(
      input.scripts,
      (script) => script.arenaAuthorityPaths,
    )
  ) {
    domains.add("arena-lifecycle");
    domains.add("multiplayer-interleaving");
  }

  if (
    hasAny(
      input.scripts,
      (script) => script.chunkLifecycleEvidence,
    ) ||
    (hasActor && hasSpatial)
  ) {
    domains.add("chunk-simulation");
  }

  if (hasActor) {
    domains.add("entity-behavior");
  }

  if (
    hasAny(
      input.scripts,
      (script) => script.combatLifecycleEvidence,
    )
  ) {
    domains.add("combat-lifecycle");
  }

  if (
    hasAny(
      input.scripts,
      (script) => script.inventoryLifecycleEvidence,
    ) ||
    hasResource
  ) {
    domains.add("inventory-state");
  }

  if (
    hasAny(
      input.scripts,
      (script) => script.persistentDataLifecycleEvidence,
    ) ||
    hasAny(
      input.scripts,
      (script) => script.persistentStateScopes,
    ) ||
    edges.some(
      (edge) =>
        edge.kind === "persists" ||
        edge.kind === "recovers-to",
    )
  ) {
    domains.add("persistence-recovery");
  }

  if (
    hasAny(
      input.scripts,
      (script) => script.economyEvidence,
    ) ||
    hasResource
  ) {
    domains.add("economy-reward");
  }

  if (
    hasSpatial ||
    input.target.spatialAuthorityContract !== undefined ||
    input.target.spatialAuthorityPolicy !== undefined
  ) {
    domains.add("spatial-authority");
  }

  if (
    hasAny(
      input.scripts,
      (script) => script.deferredCallbacks,
    )
  ) {
    domains.add("temporal-ownership");
  }

  if (
    hasSpatial ||
    nodes.some(
      (node) =>
        node.kind === "phase" ||
        node.kind === "objective",
    )
  ) {
    domains.add("world-structure");
  }

  return [...domains].sort();
}
