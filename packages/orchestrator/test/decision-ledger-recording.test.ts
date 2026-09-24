import { describe, expect, it } from "vitest";
import {
  appendDecisionLedgerEntry,
  createDecisionLedger,
} from "../src/decision-ledger.js";
import {
  recordDiagnosticRepairDecision,
  recordPackageVerificationDecision,
  recordReleaseDecision,
  recordRepairAdmissionDecision,
  recordRuntimeVerificationDecision,
} from "../src/decision-ledger-recording.js";
import type {
  RepairLifecycleState,
} from "../src/repair-lifecycle.js";
import type {
  RepairProofBundle,
} from "../src/repair-proof-bundle.js";

const basis = {
  sourceFingerprint: "source-a",
  graphFingerprint: "graph-a",
  invariantRegistryRevision: "inv-a",
  runtimeEvidenceRevision: "runtime-a",
};

const lifecycle: RepairLifecycleState = {
  transactionId: "tx-1",
  stage: "static-validated",
  mutationPresent: true,
  localStaticValidationPassed: true,
  transitiveRevalidationComplete: true,
  runtimeVerificationComplete: true,
  packageVerificationComplete: true,
  pendingNodeIds: [],
  pendingPaths: [],
  reasons: [],
};

const proof: RepairProofBundle = {
  transactionId: "tx-1",
  sourceFingerprint: "source-a",
  graphFingerprint: "graph-a",
  decisionBasis: basis,
  incidentId: "incident-1",
  selectedCandidateId: "candidate-1",
  diagnosticDisposition: "repair-eligible",
  claimStrength: "proven-runtime",
  effectiveEvidenceLevel:
    "proven-with-observed-outcome",
  blastRadiusDisposition: "minimal",
  admissionDisposition: "eligible",
  supportingInvariantIds: ["invariant:ready"],
  changedNodeIds: ["node-1"],
  affectedNodeIds: ["node-1"],
  requiredRevalidationNodeIds: [],
  requiredRevalidationPaths: [],
  impactTraces: [],
  reasons: [],
};

function ledgerBeforeRelease() {
  let ledger = createDecisionLedger();

  ledger = recordDiagnosticRepairDecision(
    ledger,
    {
      incidentId: "incident-1",
      activeCandidateIds: ["candidate-1"],
      disposition: "repair-eligible",
      selectedCandidateId: "candidate-1",
      effectiveEvidenceLevel:
        "proven-with-observed-outcome",
      claimStrength: "proven-runtime",
      reasons: ["proof"],
    },
    {
      decisionId: "decision-auth",
      basis,
      evidenceIds: ["runtime:root-cause"],
    },
  );

  ledger = appendDecisionLedgerEntry(ledger, {
    id: "decision-strategy",
    kind: "repair-strategy-selection",
    transactionId: "tx-1",
    basis,
    upstreamDecisionIds: ["decision-auth"],
    outputIds: [
      "repair-strategy:selected",
      "repair-strategy:small",
      "repair-transaction:tx-1",
      "repair-invariant:invariant:ready",
    ],
  });

  ledger = recordRepairAdmissionDecision(
    ledger,
    {
      transactionId: "tx-1",
      disposition: "eligible",
      reasons: ["bounded"],
    },
    "tx-1",
    {
      decisionId: "decision-admission",
      basis,
      upstreamDecisionIds: ["decision-strategy"],
    },
  );

  ledger = recordRuntimeVerificationDecision(
    ledger,
    {
      passed: true,
      satisfiedStateRequirementIds: ["ready"],
      failedStateRequirementIds: [],
      temporalAssessments: [],
      evidenceIds: ["runtime:ready"],
      receipt: {
        transactionId: "tx-1",
        kind: "runtime",
        passed: true,
        evidenceIds: ["runtime:ready"],
      },
      reasons: ["passed"],
    },
    "tx-1",
    {
      decisionId: "decision-runtime",
      basis,
      upstreamDecisionIds: ["decision-admission"],
    },
  );

  ledger = recordPackageVerificationDecision(
    ledger,
    {
      ok: true,
      packageFingerprint: "pkg",
      source: { sha256: "content", files: 1 },
      extracted: { sha256: "content", files: 1 },
      archiveEntries: 1,
      receipt: {
        transactionId: "tx-1",
        kind: "package",
        passed: true,
        evidenceIds: ["package:pkg"],
      },
    },
    "tx-1",
    {
      decisionId: "decision-package",
      basis,
      upstreamDecisionIds: ["decision-admission"],
    },
  );

  return ledger;
}

describe("decision ledger recording", () => {
  it("records release only after executing a valid release lineage gate", () => {
    const result = recordReleaseDecision(
      ledgerBeforeRelease(),
      lifecycle,
      proof,
      basis,
      {
        decisionId: "decision-release",
        evidenceIds: ["release:proof-complete"],
      },
    );

    expect(result.recorded).toBe(true);
    expect(result.release.decision.disposition)
      .toBe("release-eligible");

    expect(result.ledger.entries.map((entry) => entry.id))
      .toEqual([
        "decision-auth",
        "decision-strategy",
        "decision-admission",
        "decision-runtime",
        "decision-package",
        "decision-release",
      ]);

    expect(
      result.ledger.entries.at(-1)
        ?.upstreamDecisionIds,
    ).toEqual([
      "decision-admission",
      "decision-auth",
      "decision-package",
      "decision-runtime",
      "decision-strategy",
    ]);
  });

  it("does not record release admission when lineage gate blocks", () => {
    const staleBasis = {
      ...basis,
      graphFingerprint: "graph-new",
    };

    const result = recordReleaseDecision(
      ledgerBeforeRelease(),
      lifecycle,
      proof,
      staleBasis,
      {
        decisionId: "decision-release",
      },
    );

    expect(result.recorded).toBe(false);
    expect(result.release.decision.disposition)
      .toBe("blocked");
    expect(
      result.ledger.entries.some(
        (entry) => entry.kind === "release-admission",
      ),
    ).toBe(false);
    expect(
      result.ledger.entries.every(
        (entry) => entry.status === "invalidated",
      ),
    ).toBe(true);
  });
  it("rejects runtime decision recording without evidence revision", () => {
    expect(() => recordDiagnosticRepairDecision(
      createDecisionLedger(),
      {
        incidentId: "incident-1",
        activeCandidateIds: ["candidate-1"],
        disposition: "repair-eligible",
        selectedCandidateId: "candidate-1",
        effectiveEvidenceLevel:
          "proven-with-observed-outcome",
        claimStrength: "proven-runtime",
        reasons: ["proof"],
      },
      {
        decisionId: "missing-evidence-basis",
        basis: {
          sourceFingerprint: "source-a",
          graphFingerprint: "graph-a",
        },
      },
    )).toThrow(/runtimeEvidenceRevision/);

    expect(() => recordRuntimeVerificationDecision(
      createDecisionLedger(),
      {
        passed: true,
        satisfiedStateRequirementIds: [],
        failedStateRequirementIds: [],
        temporalAssessments: [],
        evidenceIds: [],
        receipt: {
          transactionId: "tx-1",
          kind: "runtime",
          passed: true,
          evidenceIds: [],
        },
        reasons: [],
      },
      "tx-1",
      {
        decisionId: "runtime-missing-evidence-basis",
        basis: {},
      },
    )).toThrow(/runtimeEvidenceRevision/);
  });
});
