import type {
  GameplayIntentModel,
  GameplayIntentNodeKind,
} from "../../gameplay-intent/src/index.js";
import type {
  ArenaCapacityExtractionResult,
} from "./arena-capacity-extraction.js";
import type {
  ArenaCleanupSurfaceAnalysis,
} from "./arena-cleanup-surface-analysis.js";
import type {
  ArenaLayoutReconciliation,
} from "./arena-layout-reconciliation.js";
import type {
  ArenaLifecycleAnalysis,
} from "./arena-lifecycle-analysis.js";
import type {
  ArenaProofConclusionReport,
} from "./arena-proof-conclusion.js";
import type {
  ArenaStateIsolationAnalysis,
} from "./arena-state-isolation-analysis.js";
import type {
  ScriptSpatialAnalysis,
} from "./script-spatial-analysis.js";

export interface GameplayWorldSubjectSummary {
  kind: GameplayIntentNodeKind;
  ids: readonly string[];
  authored: number;
  inferred: number;
  hypothesis: number;
}

export interface GameplayWorldModel {
  schemaVersion: 1;
  artifactId: string;
  subjects: readonly GameplayWorldSubjectSummary[];
  arenas: {
    detected: boolean;
    count?: number;
    basis?: "topology" | "script-config" | "reconciled";
    layoutStatus?: ArenaLayoutReconciliation["status"];
    requestedConcurrentArenas?: number;
    perArenaPlayerCapacity?: number;
    declaredMaxConcurrentPlayers?: number;
    capacityOk?: boolean;
    lifecycle: {
      terminalCandidates: number;
      proven: number;
      partial: number;
      unresolved: number;
    };
    cleanup: {
      acquiredSurfaces: number;
      exactProven: number;
      partial: number;
      unresolved: number;
    };
    isolation: {
      isolated: number;
      partitionProofRequired: number;
      sharedGlobal: number;
      unknown: number;
    };
    proof?: ArenaProofConclusionReport["conclusion"];
  };
  spatial: {
    resolvedScriptEffects: number;
    structurePlacements: number;
    unresolvedScriptMutations: number;
    rejectedScriptMutations: number;
  };
  state: {
    semanticSurfaces: number;
    semanticOperations: number;
    broadWrites: number;
  };
  structures: {
    definitions: number;
    loads: number;
    unresolvedLoads: number;
    placements: number;
    runtimeLogicLoads: number;
  };
  entities: {
    definitions: number;
    knowledgePrerequisiteGaps: number;
    staticAnalysisLimits: number;
    resolvedSpawnEvidence: number;
  };
  intent: {
    invariants: number;
    unknowns: readonly {
      id: string;
      question: string;
      blockedSubjectIds: readonly string[];
    }[];
  };
}

export interface GameplayWorldModelSource {
  artifactId: string;
  intent: GameplayIntentModel;
  arena: {
    autoDetected: boolean;
    spatialLayout?: {
      basis: "topology" | "script-config" | "reconciled";
      replicas: readonly unknown[];
    };
    discovery?: {
      replicas: readonly unknown[];
    };
    layoutReconciliation?: ArenaLayoutReconciliation;
    capacity?: ArenaCapacityExtractionResult;
    lifecycle?: ArenaLifecycleAnalysis;
    cleanupSurfaces?: ArenaCleanupSurfaceAnalysis;
    stateIsolation?: ArenaStateIsolationAnalysis;
    proofConclusion?: ArenaProofConclusionReport;
    entitySpawnEvidence?: readonly unknown[];
  };
  scriptSpatial: ScriptSpatialAnalysis;
  semanticIr: {
    stateSurfaces: number;
    stateOperations: number;
  };
  broadWrites: number;
  structures: {
    definitions: number;
    loads: number;
    unresolvedLoads: number;
    placements: number;
    runtimeLogicLoads: number;
  };
  entities: {
    definitions: number;
    knowledgePrerequisiteGaps: number;
    staticAnalysisLimits: number;
  };
}

const SUBJECT_KINDS: readonly GameplayIntentNodeKind[] = [
  "game",
  "mechanic",
  "actor",
  "role",
  "objective",
  "phase",
  "state",
  "resource",
  "lifecycle",
  "spatial-region",
  "policy",
  "outcome",
];

function summarizeSubjects(
  intent: GameplayIntentModel,
): GameplayWorldSubjectSummary[] {
  return SUBJECT_KINDS.map((kind) => {
    const nodes = intent.nodes
      .filter((node) => node.kind === kind)
      .sort((a, b) => a.id.localeCompare(b.id));
    return {
      kind,
      ids: nodes.map((node) => node.id),
      authored: nodes.filter(
        (node) => node.status === "authored",
      ).length,
      inferred: nodes.filter(
        (node) => node.status === "inferred",
      ).length,
      hypothesis: nodes.filter(
        (node) => node.status === "hypothesis",
      ).length,
    };
  }).filter((item) => item.ids.length > 0);
}

export function deriveGameplayWorldModel(
  source: GameplayWorldModelSource,
): GameplayWorldModel {
  const arenaCount =
    source.arena.spatialLayout !== undefined
      ? 1 + source.arena.spatialLayout.replicas.length
      : source.arena.discovery !== undefined
        ? 1 + source.arena.discovery.replicas.length
        : source.arena.capacity?.evidence
            .requestedConcurrentArenas;

  return {
    schemaVersion: 1,
    artifactId: source.artifactId,
    subjects: summarizeSubjects(source.intent),
    arenas: {
      detected:
        source.arena.autoDetected ||
        arenaCount !== undefined,
      ...(arenaCount === undefined
        ? {}
        : { count: arenaCount }),
      ...(source.arena.spatialLayout === undefined
        ? {}
        : {
            basis:
              source.arena.spatialLayout.basis,
          }),
      ...(source.arena.layoutReconciliation === undefined
        ? {}
        : {
            layoutStatus:
              source.arena.layoutReconciliation.status,
          }),
      ...(source.arena.capacity?.evidence
          .requestedConcurrentArenas === undefined
        ? {}
        : {
            requestedConcurrentArenas:
              source.arena.capacity.evidence
                .requestedConcurrentArenas,
          }),
      ...(source.arena.capacity?.evidence
          .perArenaPlayerCapacity === undefined
        ? {}
        : {
            perArenaPlayerCapacity:
              source.arena.capacity.evidence
                .perArenaPlayerCapacity,
          }),
      ...(source.arena.capacity?.evidence
          .declaredMaxConcurrentPlayers === undefined
        ? {}
        : {
            declaredMaxConcurrentPlayers:
              source.arena.capacity.evidence
                .declaredMaxConcurrentPlayers,
          }),
      ...(source.arena.capacity?.report === undefined
        ? {}
        : {
            capacityOk:
              source.arena.capacity.report.ok,
          }),
      lifecycle: {
        terminalCandidates:
          source.arena.lifecycle?.terminalCandidates ?? 0,
        proven:
          source.arena.lifecycle?.proven ?? 0,
        partial:
          source.arena.lifecycle?.partial ?? 0,
        unresolved:
          source.arena.lifecycle?.unresolved ?? 0,
      },
      cleanup: {
        acquiredSurfaces:
          source.arena.cleanupSurfaces
            ?.acquiredSurfaces ?? 0,
        exactProven:
          source.arena.cleanupSurfaces
            ?.exactProven ?? 0,
        partial:
          source.arena.cleanupSurfaces
            ?.partial ?? 0,
        unresolved:
          source.arena.cleanupSurfaces
            ?.unresolved ?? 0,
      },
      isolation: {
        isolated:
          source.arena.stateIsolation?.isolated ?? 0,
        partitionProofRequired:
          source.arena.stateIsolation
            ?.partitionProofRequired ?? 0,
        sharedGlobal:
          source.arena.stateIsolation
            ?.sharedGlobal ?? 0,
        unknown:
          source.arena.stateIsolation?.unknown ?? 0,
      },
      ...(source.arena.proofConclusion === undefined
        ? {}
        : {
            proof:
              source.arena.proofConclusion.conclusion,
          }),
    },
    spatial: {
      resolvedScriptEffects:
        source.scriptSpatial.resolvedEffects.length,
      structurePlacements:
        source.scriptSpatial.structurePlacements.length,
      unresolvedScriptMutations:
        source.scriptSpatial.failures.length,
      rejectedScriptMutations:
        source.scriptSpatial.rejectedMutations,
    },
    state: {
      semanticSurfaces:
        source.semanticIr.stateSurfaces,
      semanticOperations:
        source.semanticIr.stateOperations,
      broadWrites: source.broadWrites,
    },
    structures: {
      ...source.structures,
    },
    entities: {
      ...source.entities,
      resolvedSpawnEvidence:
        source.arena.entitySpawnEvidence?.length ?? 0,
    },
    intent: {
      invariants: source.intent.invariants.length,
      unknowns: source.intent.unknowns
        .map((item) => ({
          id: item.id,
          question: item.question,
          blockedSubjectIds: [
            ...item.blockedSubjectIds,
          ],
        }))
        .sort((a, b) =>
          a.id.localeCompare(b.id)
        ),
    },
  };
}
