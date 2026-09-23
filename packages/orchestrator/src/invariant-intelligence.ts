import type {
  MinecraftUpdateDelta,
  RuntimeObservationSnapshot,
} from "../../reliability/src/index.js";
import type { CampaignHistoryRecord } from "../../reliability-search/src/campaign-history.js";
import {
  challengeMinedInvariants,
  createInvariantRevalidationTasks,
  draftInvariantPromotion,
  mineInvariantEvidence,
  summarizeCrossMapInvariantEvidence,
  type InvariantMiningOptions,
  type MapInvariantEvidence,
  type SnapshotCoverageEvidence,
} from "../../reliability-search/src/index.js";

export interface InvariantIntelligenceInput {
  knownGoodSnapshots?: readonly RuntimeObservationSnapshot[];
  evidence?: readonly SnapshotCoverageEvidence[];
  historicalFailureSnapshots?: readonly RuntimeObservationSnapshot[];
  campaignHistory?: readonly CampaignHistoryRecord[];
  currentMinecraftVersion?: string;
  updateDelta?: MinecraftUpdateDelta;
  crossMapEvidence?: readonly MapInvariantEvidence[];
  options?: InvariantMiningOptions;
}

export function buildInvariantIntelligence(input: InvariantIntelligenceInput) {
  const evidence = input.evidence ?? (input.knownGoodSnapshots ?? []).map((snapshot) => ({ snapshot }));
  const mined = mineInvariantEvidence(evidence, input.options);
  const challenged = challengeMinedInvariants(mined.candidates, {
    historicalFailures: input.historicalFailureSnapshots,
    campaignHistory: input.campaignHistory,
    currentMinecraftVersion: input.currentMinecraftVersion,
  });

  return {
    observations: mined.observations,
    distinctStates: mined.distinctStates,
    distinctCoverageBuckets: mined.distinctCoverageBuckets,
    distinctMaps: mined.distinctMaps,
    minecraftVersions: mined.minecraftVersions,
    candidates: challenged.map((candidate) => ({
      candidate,
      promotion: draftInvariantPromotion(candidate),
    })),
    rejected: mined.rejected,
    crossMap: input.crossMapEvidence
      ? summarizeCrossMapInvariantEvidence(input.crossMapEvidence)
      : [],
    revalidationQueue: input.updateDelta
      ? createInvariantRevalidationTasks([...challenged, ...mined.rejected], input.updateDelta)
      : [],
  };
}
