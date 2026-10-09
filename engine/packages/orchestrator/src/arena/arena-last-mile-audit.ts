import type { ArenaVoxelProof } from "./arena-voxel-proof.js";
import {
  proposeTickingAreaConsolidation,
  type TickingAreaConsolidationInput,
  type TickingAreaConsolidationPlan,
} from "../release/ticking-area-consolidation.js";
import {
  assessWorldReleaseState,
  type WorldReleaseStateAssessment,
  type WorldReleaseStateInput,
} from "../release/world-release-state.js";
import {
  analyzePendingWorldOperations,
  type NativeWorldRecordObservation,
  type PendingWorldOperationAnalysis,
} from "../release/pending-world-operation-analysis.js";
import {
  assessStructureTransitionResidue,
  type StructureTransitionResidueAssessment,
} from "../inspection/structure-transition-residue.js";
import {
  analyzeMultiplayerStaticRisks,
  type MultiplayerStaticRiskAnalysis,
} from "../../../../analyzers/scripts/src/index.js";
import type { McStructureModel } from "../../../../adapters/mcstructure/src/index.js";

export interface ArenaLastMileAuditInput {
  voxelProof?: ArenaVoxelProof;
  tickingArea?: TickingAreaConsolidationInput;
  worldRelease?: WorldReleaseStateInput;
  nativeWorldRecords?: readonly NativeWorldRecordObservation[];
  transitionStructures?: readonly {
    id: string;
    structure: McStructureModel;
  }[];
  scriptSources?: readonly {
    id: string;
    sourceText: string;
  }[];
}

export interface ArenaLastMileAuditResult {
  tickingArea?: TickingAreaConsolidationPlan;
  worldRelease?: WorldReleaseStateAssessment;
  pendingWorldOperations?: PendingWorldOperationAnalysis;
  transitionStructures: readonly {
    id: string;
    assessment: StructureTransitionResidueAssessment;
  }[];
  multiplayerStaticRisks: readonly {
    id: string;
    analysis: MultiplayerStaticRiskAnalysis;
  }[];
  releaseBlockers: readonly string[];
  recommendations: readonly string[];
}

export function runArenaLastMileAudit(
  input: ArenaLastMileAuditInput,
): ArenaLastMileAuditResult {
  const tickingArea = input.tickingArea
    ? proposeTickingAreaConsolidation(input.tickingArea)
    : undefined;
  const worldRelease = input.worldRelease
    ? assessWorldReleaseState(input.worldRelease)
    : undefined;
  const pendingWorldOperations = input.nativeWorldRecords
    ? analyzePendingWorldOperations(input.nativeWorldRecords)
    : undefined;
  const transitionStructures = (input.transitionStructures ?? []).map((item) => ({
    id: item.id,
    assessment: assessStructureTransitionResidue(item.structure),
  }));
  const multiplayerStaticRisks = (input.scriptSources ?? []).map((item) => ({
    id: item.id,
    analysis: analyzeMultiplayerStaticRisks(item.sourceText),
  }));

  const releaseBlockers: string[] = [];
  const recommendations: string[] = [];

  if (worldRelease && !worldRelease.releasable) {
    releaseBlockers.push(
      "World release-state policy has blocker or major findings.",
    );
  }

  if (pendingWorldOperations?.releaseBlocking) {
    releaseBlockers.push(
      "Persisted pending world operations indicate unfinished world mutation work.",
    );
  }

  const riskyStructures = transitionStructures.filter(
    (item) => item.assessment.status === "residue-risk",
  );
  if (riskyStructures.length > 0) {
    releaseBlockers.push(
      String(riskyStructures.length) +
      " transition structure(s) contain active structure_void cells and require residue proof.",
    );
  }

  if (tickingArea?.status === "feasible") {
    recommendations.push(
      "Consolidate per-arena ticking areas using the proven merged bounding area before increasing arena concurrency.",
    );
  } else if (tickingArea?.status === "not-feasible") {
    recommendations.push(
      "Ticking-area consolidation alone cannot satisfy the requested concurrency target; reduce permanent leases, lower per-arena residency, or revise the target.",
    );
  }

  const majorStaticRisks = multiplayerStaticRisks.reduce(
    (sum, item) => sum + item.analysis.major,
    0,
  );
  if (majorStaticRisks > 0) {
    recommendations.push(
      String(majorStaticRisks) +
      " major multiplayer static risk(s) should be resolved or proven safe with arena ownership evidence.",
    );
  }

  return {
    ...(tickingArea ? { tickingArea } : {}),
    ...(worldRelease ? { worldRelease } : {}),
    ...(pendingWorldOperations ? { pendingWorldOperations } : {}),
    transitionStructures,
    multiplayerStaticRisks,
    releaseBlockers,
    recommendations,
  };
}
