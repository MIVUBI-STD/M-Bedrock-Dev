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
      upstreamDecisionIds: ["decision-1"],
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
      upstreamDecisionIds: ["decision-1"],
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

  it("invalidates descendants when an upstream decision becomes stale", () => {
    let ledger = createDecisionLedger();
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "parent",
      kind: "repair-authorization",
      basis: { graphFingerprint: "graph-a" },
    });
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "child",
      kind: "repair-admission",
      basis: {},
      upstreamDecisionIds: ["parent"],
    });
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "grandchild",
      kind: "release-admission",
      basis: {},
      upstreamDecisionIds: ["child"],
    });

    ledger = invalidateStaleDecisionLedger(ledger, {
      graphFingerprint: "graph-b",
    });

    expect(ledger.entries.map((entry) => entry.status))
      .toEqual(["invalidated", "invalidated", "invalidated"]);
    expect(ledger.entries[2]?.invalidationReason)
      .toMatch(/Upstream decision/);
  });

  it("rejects missing or inactive upstream decision parents", () => {
    expect(() => appendDecisionLedgerEntry(
      createDecisionLedger(),
      {
        id: "child",
        kind: "repair-admission",
        basis: {},
        upstreamDecisionIds: ["missing"],
      },
    )).toThrow(/does not exist/);

    let ledger = appendDecisionLedgerEntry(
      createDecisionLedger(),
      {
        id: "parent",
        kind: "repair-authorization",
        basis: { graphFingerprint: "old" },
      },
    );
    ledger = invalidateStaleDecisionLedger(ledger, {
      graphFingerprint: "new",
    });

    expect(() => appendDecisionLedgerEntry(
      ledger,
      {
        id: "child",
        kind: "repair-admission",
        basis: {},
        upstreamDecisionIds: ["parent"],
      },
    )).toThrow(/not active/);
  });

  it("rejects supersession by an older decision", () => {
    let ledger = createDecisionLedger();
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "old",
      kind: "diagnostic-candidate-selection",
      basis: {},
    });
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "new",
      kind: "diagnostic-candidate-selection",
      basis: {},
    });

    expect(() => supersedeDecisionLedgerEntry(
      ledger,
      "new",
      "old",
    )).toThrow(/newer/);
  });

});
