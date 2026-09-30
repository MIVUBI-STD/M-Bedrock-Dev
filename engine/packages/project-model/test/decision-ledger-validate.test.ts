import { describe, expect, it } from "vitest";
import {
  parseDecisionLedgerSnapshot,
  validateDecisionLedgerSnapshot,
} from "../src/decision-ledger-validate.js";

function entry(
  id: string,
  sequence: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    kind: "repair-admission",
    status: "active",
    basis: {},
    upstreamDecisionIds: [],
    inputIds: [],
    outputIds: [],
    evidenceIds: [],
    createdSequence: sequence,
    ...overrides,
  };
}

describe("decision ledger validation", () => {
  it("accepts a valid append-only decision DAG", () => {
    const snapshot = {
      schemaVersion: 1,
      entries: [
        entry("parent", 1),
        entry("child", 2, {
          upstreamDecisionIds: ["parent"],
        }),
      ],
    };

    expect(parseDecisionLedgerSnapshot(snapshot))
      .toEqual(snapshot);
  });

  it("rejects missing and forward upstream decisions", () => {
    expect(validateDecisionLedgerSnapshot({
      schemaVersion: 1,
      entries: [
        entry("child", 1, {
          upstreamDecisionIds: ["missing"],
        }),
      ],
    }).join(" ")).toMatch(/missing upstream decision/);

    expect(validateDecisionLedgerSnapshot({
      schemaVersion: 1,
      entries: [
        entry("child", 1, {
          upstreamDecisionIds: ["parent"],
        }),
        entry("parent", 2),
      ],
    }).join(" ")).toMatch(/must be older/);
  });

  it("rejects an active child of an invalidated parent", () => {
    expect(validateDecisionLedgerSnapshot({
      schemaVersion: 1,
      entries: [
        entry("parent", 1, {
          status: "invalidated",
          invalidationReason: "basis changed",
        }),
        entry("child", 2, {
          upstreamDecisionIds: ["parent"],
        }),
      ],
    }).join(" ")).toMatch(/depends on non-active/);
  });

  it("rejects non-monotonic sequence order", () => {
    expect(validateDecisionLedgerSnapshot({
      schemaVersion: 1,
      entries: [
        entry("a", 2),
        entry("b", 1),
      ],
    }).join(" ")).toMatch(/strictly increasing/);
  });

  it("rejects supersession by an older decision", () => {
    expect(validateDecisionLedgerSnapshot({
      schemaVersion: 1,
      entries: [
        entry("old", 1),
        entry("new", 2, {
          status: "superseded",
          supersededBy: "old",
        }),
      ],
    }).join(" ")).toMatch(/newer decision/);
  });

  it("rejects duplicate ids and duplicate lineage values", () => {
    const errors = validateDecisionLedgerSnapshot({
      schemaVersion: 1,
      entries: [
        entry("a", 1),
        entry("a", 2, {
          upstreamDecisionIds: ["a", "a"],
        }),
      ],
    }).join(" ");

    expect(errors).toMatch(/Duplicate decision ledger id/);
    expect(errors).toMatch(/duplicate value/);
  });

  it("rejects unknown or empty decision basis revisions", () => {
    const base = {
      schemaVersion: 1,
      entries: [{
        id: "d1",
        kind: "repair-authorization",
        status: "active",
        basis: {
          contractRegistryRevision: "",
          contractRegsitryRevision: "typo",
        },
        upstreamDecisionIds: [],
        inputIds: [],
        outputIds: [],
        evidenceIds: [],
        createdSequence: 1,
      }],
    };

    const errors = validateDecisionLedgerSnapshot(base);
    expect(errors.join(" ")).toMatch(/contractRegistryRevision/);
    expect(errors.join(" ")).toMatch(/unknown field contractRegsitryRevision/);
  });


  it("rejects runtime verification without runtime evidence revision", () => {
    const errors = validateDecisionLedgerSnapshot({
      schemaVersion: 1,
      entries: [{
        id: "runtime",
        kind: "runtime-verification",
        status: "active",
        transactionId: "tx-1",
        basis: {},
        upstreamDecisionIds: [],
        inputIds: [],
        outputIds: ["runtime-verification:passed"],
        evidenceIds: ["runtime:pass"],
        createdSequence: 1,
      }],
    });

    expect(errors.join(" "))
      .toMatch(/runtime-verification requires runtimeEvidenceRevision/);
  });

  it("rejects provider provenance without provider registry revision", () => {
    const errors = validateDecisionLedgerSnapshot({
      schemaVersion: 1,
      entries: [{
        id: "strategy",
        kind: "repair-strategy-selection",
        status: "active",
        transactionId: "tx-1",
        basis: {
          invariantRegistryRevision: "inv-r1",
        },
        upstreamDecisionIds: [],
        inputIds: ["repair-provider:provider@1"],
        outputIds: [
          "repair-strategy:selected",
          "repair-invariant:inv-1",
        ],
        evidenceIds: [],
        createdSequence: 1,
      }],
    });

    expect(errors.join(" "))
      .toMatch(/repairProviderRegistryRevision/);
  });

  it("rejects invariant provenance without invariant registry revision", () => {
    const errors = validateDecisionLedgerSnapshot({
      schemaVersion: 1,
      entries: [{
        id: "strategy",
        kind: "repair-strategy-selection",
        status: "active",
        transactionId: "tx-1",
        basis: {},
        upstreamDecisionIds: [],
        inputIds: [],
        outputIds: [
          "repair-strategy:selected",
          "repair-invariant:inv-1",
        ],
        evidenceIds: [],
        createdSequence: 1,
      }],
    });

    expect(errors.join(" "))
      .toMatch(/invariantRegistryRevision/);
  });

  it("rejects provider-bound strategy basis without provider provenance", () => {
    const errors = validateDecisionLedgerSnapshot({
      schemaVersion: 1,
      entries: [{
        id: "strategy",
        kind: "repair-strategy-selection",
        status: "active",
        transactionId: "tx-1",
        basis: {
          repairProviderRegistryRevision: "providers-r1",
        },
        upstreamDecisionIds: [],
        inputIds: [],
        outputIds: ["repair-strategy:selected"],
        evidenceIds: [],
        createdSequence: 1,
      }],
    });

    expect(errors.join(" "))
      .toMatch(/requires repair-provider provenance/);
  });

});
