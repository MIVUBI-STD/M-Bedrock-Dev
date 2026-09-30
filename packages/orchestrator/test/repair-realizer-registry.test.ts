import { describe, expect, it } from "vitest";
import { SemanticGraph } from "../../graph/src/index.js";
import { createPatchTransaction } from "../../repair/src/index.js";
import {
  BUILTIN_REPAIR_REALIZERS,
  assessRepairRealizerCoverage,
  deriveChangedSemanticNodeIds,
  repairRealizerRegistryRevision,
  type RepairStrategyEnumeration,
} from "../src/index.js";

describe("repair realizer registry and graph binding", () => {
  it("derives changed semantic nodes from operation source refs", () => {
    const graph = new SemanticGraph();
    graph.addNode({
      id: "function:p:test",
      identity: {
        kind: "function",
        scope: "p",
        identifier: "test",
      },
      kind: "function",
      identifier: "test",
      source: {
        artifactId: "art",
        relativePath: "functions/test.mcfunction",
      },
    });
    graph.addNode({
      id: "command:p:test:4",
      identity: {
        kind: "command",
        scope: "p",
        identifier: "test:4",
      },
      kind: "command",
      identifier: "test:4",
      source: {
        artifactId: "art",
        relativePath: "functions/test.mcfunction",
        range: { lineStart: 4, lineEnd: 4 },
      },
    });
    graph.addNode({
      id: "command:p:test:9",
      identity: {
        kind: "command",
        scope: "p",
        identifier: "test:9",
      },
      kind: "command",
      identifier: "test:9",
      source: {
        artifactId: "art",
        relativePath: "functions/test.mcfunction",
        range: { lineStart: 9, lineEnd: 9 },
      },
    });

    const transaction = createPatchTransaction({
      title: "change line four",
      sourceFingerprint: "source-a",
      operations: [{
        kind: "replace-text",
        source: {
          artifactId: "art",
          relativePath: "functions/test.mcfunction",
          range: { lineStart: 4, lineEnd: 4 },
        },
        expected: "old",
        replacement: "new",
      }],
      preconditions: [{
        kind: "source-fingerprint",
        expected: "source-a",
      }],
      validation: [{ kind: "rebuild-graph" }],
    });

    expect(
      deriveChangedSemanticNodeIds(
        graph,
        transaction,
      ),
    ).toEqual({
      changedNodeIds: [
        "command:p:test:4",
        "function:p:test",
      ],
      unmatchedOperationPaths: [],
    });
  });

  it("reports operation paths that do not exist in the current graph", () => {
    const graph = new SemanticGraph();
    const transaction = createPatchTransaction({
      title: "unknown source",
      sourceFingerprint: "source-a",
      operations: [{
        kind: "replace-text",
        source: {
          artifactId: "art",
          relativePath: "functions/missing.mcfunction",
          range: { lineStart: 1, lineEnd: 1 },
        },
        expected: "old",
        replacement: "new",
      }],
      preconditions: [{
        kind: "source-fingerprint",
        expected: "source-a",
      }],
      validation: [{ kind: "rebuild-graph" }],
    });

    expect(
      deriveChangedSemanticNodeIds(
        graph,
        transaction,
      ),
    ).toEqual({
      changedNodeIds: [],
      unmatchedOperationPaths: [
        "functions/missing.mcfunction",
      ],
    });
  });

  it("fingerprints realizer registry deterministically and changes on realizer version changes", () => {
    const first = repairRealizerRegistryRevision(
      BUILTIN_REPAIR_REALIZERS,
    );
    const reordered = repairRealizerRegistryRevision({
      ...BUILTIN_REPAIR_REALIZERS,
      realizers: [
        ...BUILTIN_REPAIR_REALIZERS.realizers,
      ].reverse(),
    });
    const changed = repairRealizerRegistryRevision({
      ...BUILTIN_REPAIR_REALIZERS,
      realizers:
        BUILTIN_REPAIR_REALIZERS.realizers.map(
          (item) => ({
            ...item,
            version: item.version + ".next",
          }),
        ),
    });

    expect(reordered).toBe(first);
    expect(changed).not.toBe(first);
  });

  it("reports missing concrete realization coverage separately from provider applicability", () => {
    const enumeration: RepairStrategyEnumeration = {
      envelope: {
        incidentId: "incident",
        candidateId: "cause",
        sourceFingerprint: "source",
        chainIds: [],
        relationIds: [],
        invariantIds: [],
        diagnosticIds: ["diag"],
        diagnosticCodes: [
          "TOPOLOGY_TRANSLATION_OUTLIER",
        ],
        sourceRefs: [],
        exactSourceRefs: [],
        causalBinding: {},
        targetProfileFingerprints: [],
        automaticRealizationAllowed: false,
        reasons: [],
      },
      applicableSources: [{
        sourceKind: "provider",
        sourceId: "linear-topology-repair",
        sourceVersion: "1",
        selectionMode: "proposal-only",
        deterministic: true,
        applicableDiagnosticIds: ["diag"],
        applicableDiagnosticCodes: [
          "TOPOLOGY_TRANSLATION_OUTLIER",
        ],
        automaticRealizationEligible: false,
        reasons: [],
      }, {
        sourceKind: "provider",
        sourceId: "missing-realizer",
        sourceVersion: "1",
        selectionMode: "proposal-only",
        deterministic: true,
        applicableDiagnosticIds: ["diag"],
        applicableDiagnosticCodes: [
          "TOPOLOGY_TRANSLATION_OUTLIER",
        ],
        automaticRealizationEligible: false,
        reasons: [],
      }, {
        sourceKind: "built-in-planner",
        sourceId: "intentional-proposal",
        sourceVersion: "1",
        selectionMode: "proposal-only",
        deterministic: false,
        applicableDiagnosticIds: ["diag"],
        applicableDiagnosticCodes: [
          "TOPOLOGY_TRANSLATION_OUTLIER",
        ],
        automaticRealizationEligible: false,
        reasons: [],
      }],
      inapplicableSources: [],
      coverageMissing: false,
      reasons: [],
    };

    const report = assessRepairRealizerCoverage(
      enumeration,
      BUILTIN_REPAIR_REALIZERS,
    );

    expect(report).toMatchObject({
      coveredSources: 1,
      uncoveredSources: 1,
      realizerNotRequiredSources: 1,
      complete: false,
    });
    expect(report.items).toEqual([
      expect.objectContaining({
        sourceId: "intentional-proposal",
        status: "realizer-not-required",
      }),
      expect.objectContaining({
        sourceId: "linear-topology-repair",
        status: "realizer-available",
        realizerId:
          "linear-topology-repair-realizer",
      }),
      expect.objectContaining({
        sourceId: "missing-realizer",
        status: "missing-realizer",
      }),
    ]);
  });
});
