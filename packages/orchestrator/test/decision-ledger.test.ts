import { describe, expect, it } from "vitest";
import {
  activeDecisionLedgerEntries,
  appendDecisionLedgerEntry,
  createDecisionLedger,
  invalidateStaleDecisionLedger,
  supersedeDecisionLedgerEntry,
} from "../src/decision-ledger.js";

describe("decision ledger", () => {
  it("appends deterministic monotonic entries without overwriting history", () => {
    let ledger = createDecisionLedger();
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "decision-1",
      kind: "repair-authorization",
      incidentId: "incident-1",
      basis: {
        sourceFingerprint: "source-a",
        graphFingerprint: "graph-a",
      },
      evidenceIds: ["evidence-1"],
    });
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "decision-2",
      kind: "repair-admission",
      transactionId: "tx-1",
      basis: {
        sourceFingerprint: "source-a",
        graphFingerprint: "graph-a",
      },
      inputIds: ["decision-1"],
    });

    expect(ledger.entries.map((entry) => entry.createdSequence))
      .toEqual([1, 2]);
    expect(ledger.entries[0]?.status).toBe("active");
  });

  it("invalidates active decisions when a declared basis changes", () => {
    let ledger = appendDecisionLedgerEntry(
      createDecisionLedger(),
      {
        id: "decision-1",
        kind: "repair-authorization",
        basis: {
          sourceFingerprint: "source-a",
          graphFingerprint: "graph-a",
          invariantRegistryRevision: "inv-a",
        },
      },
    );

    ledger = invalidateStaleDecisionLedger(ledger, {
      sourceFingerprint: "source-a",
      graphFingerprint: "graph-b",
      invariantRegistryRevision: "inv-a",
    });

    expect(ledger.entries[0]).toMatchObject({
      status: "invalidated",
    });
    expect(ledger.entries[0]?.invalidationReason)
      .toMatch(/graphFingerprint changed/);
  });

  it("does not invalidate decisions for basis dimensions they never declared", () => {
    let ledger = appendDecisionLedgerEntry(
      createDecisionLedger(),
      {
        id: "decision-1",
        kind: "diagnostic-candidate-selection",
        basis: {
          knowledgeRevision: "k1",
        },
      },
    );

    ledger = invalidateStaleDecisionLedger(ledger, {
      knowledgeRevision: "k1",
      graphFingerprint: "graph-new",
    });

    expect(activeDecisionLedgerEntries(ledger)).toHaveLength(1);
  });

  it("supersedes rather than mutating prior decision content", () => {
    let ledger = createDecisionLedger();
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "decision-1",
      kind: "diagnostic-candidate-selection",
      basis: { knowledgeRevision: "k1" },
    });
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "decision-2",
      kind: "diagnostic-candidate-selection",
      basis: { knowledgeRevision: "k1" },
      inputIds: ["decision-1"],
    });
    ledger = supersedeDecisionLedgerEntry(
      ledger,
      "decision-1",
      "decision-2",
    );

    expect(ledger.entries[0]).toMatchObject({
      status: "superseded",
      supersededBy: "decision-2",
    });
    expect(ledger.entries[1]?.status).toBe("active");
  });

  it("rejects duplicate decision ids", () => {
    const ledger = appendDecisionLedgerEntry(
      createDecisionLedger(),
      {
        id: "decision-1",
        kind: "repair-admission",
        basis: {},
      },
    );

    expect(() => appendDecisionLedgerEntry(ledger, {
      id: "decision-1",
      kind: "repair-admission",
      basis: {},
    })).toThrow(/already exists/);
  });
});
