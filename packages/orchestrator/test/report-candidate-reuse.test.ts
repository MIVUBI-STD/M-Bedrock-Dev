import {
  describe,
  expect,
  it,
} from "vitest";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import {
  collectConfirmedDefects,
  describeAuditReportCandidate,
} from "../src/report-defect-collector.js";
import {
  planReportCandidateReuse,
} from "../src/report-candidate-reuse.js";

const intent: GameplayIntentModel = {
  schemaVersion: 1,
  id: "intent",
  evidence: [{
    id: "intent:evidence",
    origin: "source-code",
    locator: "scripts/session.ts",
    summary: "Authored cleanup contract.",
  }],
  nodes: [{
    id: "outcome:cleanup",
    kind: "outcome",
    label: "Cleanup",
    status: "authored",
    evidenceIds: ["intent:evidence"],
  }],
  edges: [],
  invariants: [{
    id: "inv:cleanup",
    statement: "Cleanup resets state.",
    strength: "must",
    status: "authored",
    subjectIds: ["outcome:cleanup"],
    evidenceIds: ["intent:evidence"],
  }],
  unknowns: [],
};

function candidate(
  evidenceId: string,
  disposition:
    | "probable-defect"
    | "insufficient-evidence" = "probable-defect",
) {
  return {
    route: "static" as const,
    intent,
    result: {
      disposition,
      subjectIds: ["outcome:cleanup"],
      basisInvariantIds:
        disposition === "probable-defect"
          ? ["inv:cleanup"]
          : [],
      evidenceIds: [evidenceId],
      nextEvidenceNeed:
        disposition === "probable-defect"
          ? "authored-intent" as const
          : "contradiction-proof" as const,
      reasons: ["More evidence is required."],
    },
    defect: {
      title: "Cleanup retains state",
      problem: "State remains.",
      expected: {
        authority: "authored-intent" as const,
        statement: "State resets.",
        evidenceIds: ["intent:evidence"],
      },
      observed: {
        statement: "State remains.",
        evidenceIds: [evidenceId],
      },
      classificationSignals: {
        impact: [{
          kind: "important-state-wrong" as const,
          evidenceIds: [evidenceId],
        }],
        primaryFailure: [{
          failure: "player-owned-state" as const,
          evidenceIds: ["intent:evidence"],
        }],
      },
      aiAnalysis: "Cleanup appears inconsistent.",
      sourceEvidence: [{
        source: {
          artifactId: "map",
          relativePath: "scripts/session.ts",
          range: {
            lineStart: 10,
            lineEnd: 12,
          },
        },
        reason: "Owns cleanup.",
      }],
      causalIncidentId: "incident:cleanup",
    },
  };
}

describe("report candidate reuse", () => {
  it("reuses an unchanged evidence-bound rejection", () => {
    const item = candidate("static:a");
    const descriptor =
      describeAuditReportCandidate(item);
    const previous = [{
      route: descriptor.route,
      semanticKey: descriptor.semanticKey,
      evidenceIds: descriptor.evidenceIds,
      nextEvidenceNeed: "authored-intent" as const,
      reasons: ["Need authored intent."],
    }];

    const plan = planReportCandidateReuse(
      [item],
      previous,
    );

    expect(plan.reevaluate).toHaveLength(0);
    expect(plan.reusedRejected).toEqual(previous);
  });

  it("reevaluates when evidence changes", () => {
    const oldItem = candidate("static:a");
    const nextItem = candidate("static:b");
    const oldDescriptor =
      describeAuditReportCandidate(oldItem);

    const plan = planReportCandidateReuse(
      [nextItem],
      [{
        route: oldDescriptor.route,
        semanticKey: oldDescriptor.semanticKey,
        evidenceIds: oldDescriptor.evidenceIds,
        nextEvidenceNeed: "contradiction-proof",
        reasons: ["Need contradiction proof."],
      }],
    );

    expect(plan.reevaluate).toEqual([nextItem]);
    expect(plan.reusedRejected).toHaveLength(0);
  });

  it("reevaluates terminal classifications even when evidence is unchanged", () => {
    const item = candidate("static:a");
    const descriptor =
      describeAuditReportCandidate(item);

    const plan = planReportCandidateReuse(
      [item],
      [{
        route: descriptor.route,
        semanticKey: descriptor.semanticKey,
        evidenceIds: descriptor.evidenceIds,
        nextEvidenceNeed: "none",
        reasons: ["Previously classified as non-defect."],
      }],
    );

    expect(plan.reevaluate).toEqual([item]);
  });

  it("reevaluates correction-driven rejections even with unchanged evidence", () => {
    const item = candidate("static:a");
    const descriptor =
      describeAuditReportCandidate(item);

    const plan = planReportCandidateReuse(
      [item],
      [{
        route: descriptor.route,
        semanticKey: descriptor.semanticKey,
        evidenceIds: descriptor.evidenceIds,
        nextEvidenceNeed: "candidate-correction",
        reasons: ["Correct report facts."],
      }],
    );

    expect(plan.reevaluate).toEqual([item]);
  });

  it("does not persist reuse state into confirmed defect collection", () => {
    const item = candidate(
      "static:a",
      "insufficient-evidence",
    );
    const result = collectConfirmedDefects([item]);

    expect(result.confirmed).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(
      "reuse" in result.rejected[0]!,
    ).toBe(false);
  });
});
