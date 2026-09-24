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
      basis: {
        runtimeEvidenceRevision: "runtime-r1",
      },
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

  it("invalidates decisions when runtime evidence revision changes", () => {
    let ledger = appendDecisionLedgerEntry(
      createDecisionLedger(),
      {
        id: "evidence-bound",
        kind: "repair-authorization",
        basis: {
          runtimeEvidenceRevision: "evidence-a",
        },
      },
    );

    ledger = invalidateStaleDecisionLedger(ledger, {
      runtimeEvidenceRevision: "evidence-b",
    });

    expect(ledger.entries[0]).toMatchObject({
      status: "invalidated",
    });
    expect(ledger.entries[0]?.invalidationReason)
      .toMatch(/runtimeEvidenceRevision changed/);
  });

  it("invalidates descendants when a historical contract revision is stale", () => {
    let ledger = createDecisionLedger();
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "contract-bound",
      kind: "repair-authorization",
      basis: {},
    });
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "downstream",
      kind: "release-admission",
      basis: {
        runtimeEvidenceRevision: "runtime-r1",
      },
      upstreamDecisionIds: ["contract-bound"],
    });
    ledger = {
      schemaVersion: 1,
      entries: ledger.entries.map((entry) =>
        entry.id === "contract-bound"
          ? {
              ...entry,
              basis: {
                ...entry.basis,
                contractRegistryRevision: "historical-contract-revision",
              },
            }
          : entry
      ),
    };

    ledger = invalidateStaleDecisionLedger(ledger, {});

    expect(ledger.entries.map((entry) => entry.status))
      .toEqual(["invalidated", "invalidated"]);
    expect(ledger.entries[0]?.invalidationReason)
      .toMatch(/contractRegistryRevision changed/);
    expect(ledger.entries[1]?.invalidationReason)
      .toMatch(/Upstream decision/);
  });


  it("automatically binds new decisions to the canonical contract registry", () => {
    const ledger = appendDecisionLedgerEntry(
      createDecisionLedger(),
      {
        id: "contract-bound-auto",
        kind: "repair-authorization",
        basis: {},
      },
    );

    expect(ledger.entries[0]?.basis.contractRegistryRevision)
      .toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects callers that try to append a stale contract revision", () => {
    expect(() => appendDecisionLedgerEntry(
      createDecisionLedger(),
      {
        id: "contract-stale",
        kind: "repair-authorization",
        basis: {
          contractRegistryRevision: "stale",
        },
      },
    )).toThrow(/contract registry revision is stale/);
  });


  it("invalidates provider-bound decisions when provider registry changes", () => {
    let ledger = appendDecisionLedgerEntry(
      createDecisionLedger(),
      {
        id: "provider-bound",
        kind: "repair-strategy-selection",
        transactionId: "tx-1",
        basis: {
          repairProviderRegistryRevision: "providers-a",
        },
        inputIds: ["repair-provider:fixture@1"],
      },
    );
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "provider-downstream",
      kind: "repair-admission",
      transactionId: "tx-1",
      basis: {},
      upstreamDecisionIds: ["provider-bound"],
    });

    ledger = invalidateStaleDecisionLedger(ledger, {
      repairProviderRegistryRevision: "providers-b",
    });

    expect(ledger.entries.map((entry) => entry.status))
      .toEqual(["invalidated", "invalidated"]);
    expect(ledger.entries[0]?.invalidationReason)
      .toMatch(/repairProviderRegistryRevision changed/);
  });

});
