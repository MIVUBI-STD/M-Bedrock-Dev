import { describe, expect, it } from "vitest";
import {
  appendDecisionLedgerEntry,
  createDecisionLedger,
} from "../src/decision-ledger.js";
import {
  decideRepairReleaseWithLineage,
} from "../src/repair-release-lineage.js";
import type {
  RepairLifecycleState,
} from "../src/repair-lifecycle.js";

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

const basis = {
  sourceFingerprint: "source",
  graphFingerprint: "graph",
  invariantRegistryRevision: "inv-r1",
};

function completeLedger() {
  let ledger = createDecisionLedger();

  ledger = appendDecisionLedgerEntry(ledger, {
    id: "auth",
    kind: "repair-authorization",
    incidentId: "incident-1",
    basis,
    outputIds: [
      "repair-disposition:repair-eligible",
      "root-cause:cause-1",
    ],
  });

  ledger = appendDecisionLedgerEntry(ledger, {
    id: "strategy",
    kind: "repair-strategy-selection",
    transactionId: "tx-1",
    basis,
    upstreamDecisionIds: ["auth"],
    outputIds: [
      "repair-strategy:selected",
      "repair-strategy:small",
      "repair-transaction:tx-1",
    ],
  });

  ledger = appendDecisionLedgerEntry(ledger, {
    id: "admission",
    kind: "repair-admission",
    transactionId: "tx-1",
    basis,
    upstreamDecisionIds: ["strategy"],
    outputIds: ["repair-admission:eligible"],
  });

  ledger = appendDecisionLedgerEntry(ledger, {
    id: "runtime",
    kind: "runtime-verification",
    transactionId: "tx-1",
    basis,
    upstreamDecisionIds: ["admission"],
    outputIds: ["runtime-verification:passed"],
    evidenceIds: ["runtime:pass"],
  });

  ledger = appendDecisionLedgerEntry(ledger, {
    id: "package",
    kind: "package-verification",
    transactionId: "tx-1",
    basis,
    upstreamDecisionIds: ["admission"],
    outputIds: ["package-verification:passed"],
    evidenceIds: ["package:pass"],
  });

  return ledger;
}

describe("repair release lineage", () => {
  it("allows release only with a complete active proof chain", () => {
    const result = decideRepairReleaseWithLineage(
      lifecycle,
      completeLedger(),
      basis,
    );

    expect(result.decision.disposition)
      .toBe("release-eligible");
    expect(result.lineageDecisionIds).toEqual([
      "admission",
      "auth",
      "package",
      "runtime",
      "strategy",
    ]);
  });

  it("blocks release and transitively invalidates lineage when authorization basis becomes stale", () => {
    const result = decideRepairReleaseWithLineage(
      lifecycle,
      completeLedger(),
      {
        ...basis,
        graphFingerprint: "graph-new",
      },
    );

    expect(result.decision.disposition).toBe("blocked");
    expect(
      result.ledger.entries.every(
        (entry) => entry.status === "invalidated",
      ),
    ).toBe(true);
  });

  it("blocks release when strategy selection is missing", () => {
    let ledger = createDecisionLedger();

    ledger = appendDecisionLedgerEntry(ledger, {
      id: "auth",
      kind: "repair-authorization",
      basis,
    });
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "admission",
      kind: "repair-admission",
      transactionId: "tx-1",
      basis,
      upstreamDecisionIds: ["auth"],
      outputIds: ["repair-admission:eligible"],
    });
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "runtime",
      kind: "runtime-verification",
      transactionId: "tx-1",
      basis,
      upstreamDecisionIds: ["admission"],
      outputIds: ["runtime-verification:passed"],
    });
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "package",
      kind: "package-verification",
      transactionId: "tx-1",
      basis,
      upstreamDecisionIds: ["admission"],
      outputIds: ["package-verification:passed"],
    });

    const result = decideRepairReleaseWithLineage(
      lifecycle,
      ledger,
      basis,
    );

    expect(result.decision.disposition).toBe("blocked");
    expect(result.decision.reasons.join(" "))
      .toMatch(/Missing active repair-strategy-selection/);
  });

  it("blocks release when a verification stage has multiple active decisions", () => {
    let ledger = completeLedger();
    ledger = appendDecisionLedgerEntry(ledger, {
      id: "runtime-duplicate",
      kind: "runtime-verification",
      transactionId: "tx-1",
      basis,
      upstreamDecisionIds: ["admission"],
      outputIds: ["runtime-verification:passed"],
    });

    const result = decideRepairReleaseWithLineage(
      lifecycle,
      ledger,
      basis,
    );

    expect(result.decision.disposition).toBe("blocked");
    expect(result.decision.reasons.join(" "))
      .toMatch(/Multiple active runtime-verification/);
  });

  it("blocks release when verification is not descended from admission", () => {
    let ledger = completeLedger();
    const entries = ledger.entries.map((entry) =>
      entry.id === "runtime"
        ? {
            ...entry,
            upstreamDecisionIds: ["strategy"],
          }
        : entry
    );
    ledger = {
      schemaVersion: 1,
      entries,
    };

    const result = decideRepairReleaseWithLineage(
      lifecycle,
      ledger,
      basis,
    );

    expect(result.decision.disposition).toBe("blocked");
    expect(result.decision.reasons.join(" "))
      .toMatch(/Runtime verification is not descended/);
  });
});
