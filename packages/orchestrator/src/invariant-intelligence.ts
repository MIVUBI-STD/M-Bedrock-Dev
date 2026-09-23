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
    },
  );

  const candidates = challenged.map((candidate) => ({
    candidate,
    promotion: draftInvariantPromotion(candidate),
  }));

  return {
    observations: mined.observations,
    candidates,
    rejected: mined.rejected,
  };
}
