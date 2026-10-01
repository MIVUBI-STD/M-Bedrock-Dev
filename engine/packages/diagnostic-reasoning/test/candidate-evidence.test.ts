import { describe, expect, it } from "vitest";
import {
  evaluateGameplayBugCandidateEvidence,
  type GameplayBugCandidateRule,
} from "../src/index.js";

const readyContract = {
  schemaVersion: 1 as const,
  modelId: "test",
  subjectIds: ["objective:test"],
  invariantIds: ["inv:test"],
  authorityEvidenceIds: ["design:test"],
  readiness: {
    disposition: "ready" as const,
    scopeSubjectIds: ["objective:test"],
    blockingUnknownIds: [],
    toleratedUnknownIds: [],
    reasons: ["ready"],
  },
};

const rule: GameplayBugCandidateRule = {
  id: "reset-leak",
  kind: "reset-leakage",
  requiredPredicates: [
    "retry-occurs",
    "old-state-survives",
  ],
  playerImpactPredicates: [
    "next-attempt-gameplay-changed",
  ],
  counterEvidencePredicates: [
    "design-allows-persistence",
  ],
};

describe("gameplay bug candidate evidence gate", () => {
  it("fails closed when design readiness is missing", () => {
    const result = evaluateGameplayBugCandidateEvidence(
      rule,
      [],
    );
    expect(result.disposition).toBe("design-readiness-missing");
  });

  it("blocks candidate discovery when material Game Design is unresolved", () => {
    const result = evaluateGameplayBugCandidateEvidence(
      rule,
      [],
      {
        ...readyContract,
        readiness: {
          disposition: "blocked",
          scopeSubjectIds: ["objective:test"],
          blockingUnknownIds: ["unknown:design"],
          toleratedUnknownIds: [],
          reasons: ["material design unknown"],
        },
      },
    );
    expect(result.disposition).toBe("design-blocked");
  });


  it("suppresses a candidate when current design counter-evidence permits it", () => {
    const result = evaluateGameplayBugCandidateEvidence(
      rule,
      [
        { predicate: "retry-occurs", state: "present", evidenceId: "e:retry" },
        { predicate: "old-state-survives", state: "present", evidenceId: "e:state" },
        { predicate: "next-attempt-gameplay-changed", state: "present", evidenceId: "e:impact" },
        { predicate: "design-allows-persistence", state: "present", evidenceId: "e:design" },
      ],
      readyContract,
    );

    expect(result.disposition).toBe(
      "suppressed-by-counter-evidence",
    );
    expect(result.counterEvidenceIds).toEqual(["e:design"]);
  });

  it("fails closed while a declared counter-evidence check is unresolved", () => {
    const result = evaluateGameplayBugCandidateEvidence(
      rule,
      [
        { predicate: "retry-occurs", state: "present" },
        { predicate: "old-state-survives", state: "present" },
        { predicate: "next-attempt-gameplay-changed", state: "present" },
      ],
      readyContract,
    );

    expect(result.disposition).toBe(
      "counter-evidence-unresolved",
    );
  });

  it("does not report technical patterns without player-visible impact", () => {
    const result = evaluateGameplayBugCandidateEvidence(
      rule,
      [
        { predicate: "retry-occurs", state: "present" },
        { predicate: "old-state-survives", state: "present" },
        { predicate: "next-attempt-gameplay-changed", state: "absent" },
        { predicate: "design-allows-persistence", state: "absent" },
      ],
      readyContract,
    );

    expect(result.disposition).toBe("no-player-impact");
  });

  it("emits a candidate only after counter-evidence is cleared and player impact is grounded", () => {
    const result = evaluateGameplayBugCandidateEvidence(
      rule,
      [
        { predicate: "retry-occurs", state: "present", evidenceId: "e:retry" },
        { predicate: "old-state-survives", state: "present", evidenceId: "e:state" },
        { predicate: "next-attempt-gameplay-changed", state: "present", evidenceId: "e:impact" },
        { predicate: "design-allows-persistence", state: "absent" },
      ],
      readyContract,
    );

    expect(result.disposition).toBe("candidate");
    expect(result.supportingEvidenceIds).toEqual([
      "e:retry",
      "e:state",
    ]);
    expect(result.playerImpactEvidenceIds).toEqual([
      "e:impact",
    ]);
  });
});
