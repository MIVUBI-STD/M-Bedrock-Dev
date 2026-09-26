import { describe, expect, it } from "vitest";
import {
  assessInvariantFalsification,
  draftInvariantPromotion,
  type MinedInvariantCandidate,
} from "../src/index.js";

const candidate: MinedInvariantCandidate = {
  id: "candidate-cutscene",
  kind: "arena-cutscene-implies-starting-player",
  description: "Cutscene requires a starting player.",
  minecraftVersions: ["1.26.40"],
  mapIds: ["map-a"],
  support: {
    observations: 30,
    distinctStates: 5,
    distinctCoverageBuckets: 5,
    distinctMaps: 1,
    distinctVersions: 1,
    antecedentMatches: 30,
    satisfied: 30,
    counterexamples: 0,
    confidence: 1,
  },
  status: "supported",
  evidence: ["e:1"],
  counterexampleEvidence: [],
  challengeEvidence: [],
};

function campaign(
  status: "killed" | "survived",
) {
  return {
    schemaVersion: 1 as const,
    campaignId: "campaign-1",
    createdAt: "2026-09-27T00:00:00Z",
    blindspotTasks: [],
    mutationReport: {
      total: 1,
      killed: status === "killed" ? 1 : 0,
      survived: status === "survived" ? 1 : 0,
      invalid: 0,
      score: status === "killed" ? 1 : 0,
      byDomain: {},
      results: [{
        descriptor: {
          id: "mutation-1",
          operator: "shared-cutscene-lock",
          domain: "state-concurrency",
          description: "Adversarial shared lock mutation.",
        },
        status,
      }],
    },
  };
}

describe("invariant adversarial promotion gate", () => {
  it("blocks supported candidates that were never adversarially exercised", () => {
    const receipt = assessInvariantFalsification(
      candidate,
      {},
    );

    expect(receipt.disposition)
      .toBe("insufficient");
    expect(
      draftInvariantPromotion(
        candidate,
        receipt,
      ).eligible,
    ).toBe(false);
  });

  it("permits drafting only after a relevant mutation is killed", () => {
    const receipt = assessInvariantFalsification(
      candidate,
      {
        campaignHistory: [
          campaign("killed"),
        ],
      },
    );

    expect(receipt.disposition)
      .toBe("passed");
    expect(
      draftInvariantPromotion(
        candidate,
        receipt,
      ),
    ).toMatchObject({
      eligible: true,
      invariant: {
        tags: expect.arrayContaining([
          "adversarially-falsified",
        ]),
      },
    });
  });

  it("fails qualification when a relevant adversarial mutation survives", () => {
    const receipt = assessInvariantFalsification(
      candidate,
      {
        campaignHistory: [
          campaign("survived"),
        ],
      },
    );

    expect(receipt.disposition)
      .toBe("failed");
    expect(
      receipt.survivedMutationOperators,
    ).toContain("shared-cutscene-lock");
    expect(
      draftInvariantPromotion(
        candidate,
        receipt,
      ).eligible,
    ).toBe(false);
  });

  it("fails qualification when historical evidence contradicts the candidate", () => {
    const receipt = assessInvariantFalsification(
      candidate,
      {
        campaignHistory: [
          campaign("killed"),
        ],
        historicalFailures: [{
          schemaVersion: 1,
          tick: 100,
          players: [{
            playerId: "p1",
            connected: true,
            arenaId: "arena1",
            phase: "playing",
            progress: 0,
          }],
          arenas: [{
            arenaId: "arena1",
            activePlayerIds: ["p1"],
            cutsceneActive: true,
            round: 0,
          }],
        }],
      },
    );

    expect(receipt.disposition)
      .toBe("failed");
    expect(
      receipt.contradictionEvidence.length,
    ).toBeGreaterThan(0);
  });
});
