import type {
  CampaignHistoryRecord,
} from "./campaign-history.js";
import {
  challengeMinedInvariants,
  type InvariantChallengeInput,
} from "./invariant-challenge.js";
import type {
  MinedInvariantCandidate,
} from "./invariant-mining-types.js";

export type InvariantFalsificationDisposition =
  | "passed"
  | "failed"
  | "insufficient";

export interface InvariantFalsificationReceipt {
  schemaVersion: 1;
  candidateId: string;
  disposition: InvariantFalsificationDisposition;
  relevantMutationOperators: readonly string[];
  attemptedMutationOperators: readonly string[];
  survivedMutationOperators: readonly string[];
  contradictionEvidence: readonly string[];
  campaignIds: readonly string[];
  reasons: readonly string[];
}

function relevantMutationOperators(
  candidate: MinedInvariantCandidate,
): readonly string[] {
  switch (candidate.kind) {
    case "player-phase-implies-connected":
      return [
        "disconnect-preserve-progress",
        "phase-skip",
      ];
    case "player-phase-implies-arena":
      return [
        "selector-broaden",
        "tag-filter-omit",
        "phase-skip",
      ];
    case "arena-cutscene-implies-starting-player":
      return [
        "shared-cutscene-lock",
        "phase-skip",
        "timing-shift",
      ];
    case "disconnected-implies-zero-progress":
      return [
        "disconnect-preserve-progress",
        "reset-preserve-progress",
      ];
    case "player-tag-implies-score":
      return [
        "tag-filter-omit",
        "scoreboard-objective-substitution",
      ];
    case "playing-progress-nondecreasing":
      return [
        "reset-preserve-progress",
        "timing-shift",
      ];
    case "entity-arena-tag-consistency":
      return ["tag-filter-omit"];
    case "entity-within-arena-region":
      return [
        "coordinate-shift",
        "timing-shift",
      ];
  }
}

function mutationRows(
  history: readonly CampaignHistoryRecord[],
  relevant: ReadonlySet<string>,
) {
  return history.flatMap((record) =>
    (record.mutationReport?.results ?? [])
      .filter((result) =>
        relevant.has(
          result.descriptor.operator,
        )
      )
      .map((result) => ({
        campaignId: record.campaignId,
        operator:
          result.descriptor.operator,
        status: result.status,
      }))
  );
}

export function assessInvariantFalsification(
  candidate: MinedInvariantCandidate,
  input: InvariantChallengeInput,
): InvariantFalsificationReceipt {
  const challenged =
    challengeMinedInvariants(
      [candidate],
      input,
    )[0] ?? candidate;

  const relevant = [
    ...relevantMutationOperators(candidate),
  ].sort();
  const relevantSet = new Set(relevant);
  const rows = mutationRows(
    input.campaignHistory ?? [],
    relevantSet,
  );

  const attempted = [
    ...new Set(
      rows.map((row) => row.operator),
    ),
  ].sort();
  const survived = [
    ...new Set(
      rows
        .filter(
          (row) =>
            row.status === "survived",
        )
        .map((row) => row.operator),
    ),
  ].sort();
  const campaignIds = [
    ...new Set(
      rows.map((row) => row.campaignId),
    ),
  ].sort();

  const contradictions = [
    ...new Set(
      challenged.challengeEvidence.filter(
        (item) =>
          item.startsWith(
            "historical-failure:",
          ),
      ),
    ),
  ].sort();

  if (
    challenged.status === "challenged" ||
    challenged.status === "rejected" ||
    survived.length > 0 ||
    contradictions.length > 0
  ) {
    return {
      schemaVersion: 1,
      candidateId: candidate.id,
      disposition: "failed",
      relevantMutationOperators: relevant,
      attemptedMutationOperators: attempted,
      survivedMutationOperators: survived,
      contradictionEvidence:
        contradictions,
      campaignIds,
      reasons: [
        "Adversarial evidence contradicted the candidate or a relevant mutation survived.",
      ],
    };
  }

  if (
    challenged.status !== "supported"
  ) {
    return {
      schemaVersion: 1,
      candidateId: candidate.id,
      disposition: "insufficient",
      relevantMutationOperators: relevant,
      attemptedMutationOperators: attempted,
      survivedMutationOperators: survived,
      contradictionEvidence:
        contradictions,
      campaignIds,
      reasons: [
        "Only currently supported candidates can enter adversarial promotion qualification.",
      ],
    };
  }

  if (attempted.length === 0) {
    return {
      schemaVersion: 1,
      candidateId: candidate.id,
      disposition: "insufficient",
      relevantMutationOperators: relevant,
      attemptedMutationOperators: [],
      survivedMutationOperators: [],
      contradictionEvidence: [],
      campaignIds: [],
      reasons: [
        "No relevant adversarial mutation operator was exercised.",
      ],
    };
  }

  return {
    schemaVersion: 1,
    candidateId: candidate.id,
    disposition: "passed",
    relevantMutationOperators: relevant,
    attemptedMutationOperators: attempted,
    survivedMutationOperators: [],
    contradictionEvidence: [],
    campaignIds,
    reasons: [
      "At least one relevant adversarial mutation was exercised and no relevant mutation survived or contradiction was observed.",
    ],
  };
}
