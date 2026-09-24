import { describe, expect, it } from "vitest";
import {
  createDecisionLedger,
} from "../src/decision-ledger.js";
import {
  recordDiagnosticRepairDecision,
  recordPackageVerificationDecision,
  recordReleaseDecision,
  recordRepairAdmissionDecision,
  recordRuntimeVerificationDecision,
} from "../src/decision-ledger-recording.js";

describe("decision ledger recording", () => {
  it("records a typed repair lineage without overwriting prior decisions", () => {
    const basis = {
      sourceFingerprint: "source-a",
      graphFingerprint: "graph-a",
      invariantRegistryRevision: "inv-a",
    };

    let ledger = createDecisionLedger();
    ledger = recordDiagnosticRepairDecision(
      ledger,
      {
        incidentId: "incident-1",
        activeCandidateIds: ["candidate-1"],
        disposition: "repair-eligible",
        selectedCandidateId: "candidate-1",
        effectiveEvidenceLevel: "proven-with-observed-outcome",
        claimStrength: "proven-runtime",
        reasons: ["proof"],
      },
      {
        decisionId: "decision-auth",
        basis,
        evidenceIds: ["runtime:root-cause"],
      },
    );

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
        upstreamDecisionIds: ["decision-auth"],
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

    ledger = recordReleaseDecision(
      ledger,
      {
        transactionId: "tx-1",
        disposition: "release-eligible",
        reasons: ["all proof complete"],
      },
      {
        decisionId: "decision-release",
        transactionId: "tx-1",
        basis,
        upstreamDecisionIds: [
          "decision-runtime",
          "decision-package",
        ],
      },
    );

    expect(ledger.entries.map((entry) => entry.id)).toEqual([
      "decision-auth",
      "decision-admission",
      "decision-runtime",
      "decision-package",
      "decision-release",
    ]);
    expect(ledger.entries.at(-1)?.inputIds).toEqual([
      "decision-package",
      "decision-runtime",
    ]);
    expect(ledger.entries.every((entry) => entry.status === "active"))
      .toBe(true);
  });
});
