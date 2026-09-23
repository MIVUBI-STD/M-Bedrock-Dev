import type { RuntimeObservationSnapshot } from "../../reliability/src/index.js";
import type { CampaignHistoryRecord } from "../../reliability-search/src/campaign-history.js";
import {
  challengeMinedInvariants,
  draftInvariantPromotion,
  mineRuntimeInvariants,
  type InvariantMiningOptions,
} from "../../reliability-search/src/index.js";

export interface InvariantIntelligenceInput {
  knownGoodSnapshots: readonly RuntimeObservationSnapshot[];
  historicalFailureSnapshots?: readonly RuntimeObservationSnapshot[];
  campaignHistory?: readonly CampaignHistoryRecord[];
  currentMinecraftVersion?: string;
  options?: InvariantMiningOptions;
}

export function buildInvariantIntelligence(
  input: InvariantIntelligenceInput,
) {
  const mined = mineRuntimeInvariants(
    input.knownGoodSnapshots,
    input.options,
  );
  const challenged = challengeMinedInvariants(
    mined.candidates,
    {
      historicalFailures: input.historicalFailureSnapshots,
      campaignHistory: input.campaignHistory,
      currentMinecraftVersion: input.currentMinecraftVersion,
    },
  );

  return {
    observations: mined.observations,
    distinctStates: mined.distinctStates,
    minecraftVersions: mined.minecraftVersions,
    candidates: challenged.map((candidate) => ({
      candidate,
      promotion: draftInvariantPromotion(candidate),
    })),
    rejected: mined.rejected,
  };
}
