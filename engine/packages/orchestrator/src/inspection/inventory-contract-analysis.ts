import type {
  ParsedScriptFile,
  ScriptInventoryLifecycleEvidence,
} from "../../../../analyzers/scripts/src/index.js";
import {
  resolveInventoryItemBehaviorContract,
  type InventoryItemBehaviorContract,
} from "../../../behavior-model/src/index.js";

export interface InventoryDropPolicyAssessment {
  scriptId: string;
  executionRegion: string;
  itemIdentifier?: string;
  status:
    | "allowed"
    | "denied"
    | "uncovered"
    | "unknown-item";
  matchedRuleIds: readonly string[];
  reason: string;
}

export interface InventoryContractAnalysis {
  configured: boolean;
  contractId?: string;
  resolvedItemClasses: number;
  uncoveredItemClasses: number;
  unknownIdentityEvidence: number;
  dropAssessments: readonly InventoryDropPolicyAssessment[];
  deniedDrops: number;
  uncoveredDrops: number;
  unknownDrops: number;
}

function itemEvidence(
  scripts: readonly ParsedScriptFile[],
): {
  scriptId: string;
  evidence: ScriptInventoryLifecycleEvidence;
}[] {
  return scripts.flatMap((script) =>
    (script.inventoryLifecycleEvidence ?? [])
      .filter((item) =>
        item.kind === "item-grant" ||
        item.kind === "equipment-set" ||
        item.kind === "item-drop"
      )
      .map((evidence) => ({
        scriptId: script.identifier,
        evidence,
      }))
  );
}

export function analyzeInventoryContract(
  scripts: readonly ParsedScriptFile[],
  contract?: InventoryItemBehaviorContract,
): InventoryContractAnalysis {
  const evidence = itemEvidence(scripts);

  if (!contract) {
    return {
      configured: false,
      resolvedItemClasses: 0,
      uncoveredItemClasses: 0,
      unknownIdentityEvidence:
        evidence.filter(
          (item) =>
            item.evidence.itemIdentifier ===
            undefined,
        ).length,
      dropAssessments: evidence
        .filter(
          (item) =>
            item.evidence.kind ===
            "item-drop",
        )
        .map((item) => ({
          scriptId: item.scriptId,
          executionRegion:
            item.evidence.executionRegion,
          ...(item.evidence.itemIdentifier ===
          undefined
            ? {}
            : {
                itemIdentifier:
                  item.evidence.itemIdentifier,
              }),
          status:
            "unknown-item" as const,
          matchedRuleIds: [],
          reason:
            "Inventory item behavior contract is not configured for this inspection.",
        })),
      deniedDrops: 0,
      uncoveredDrops: 0,
      unknownDrops:
        evidence.filter(
          (item) =>
            item.evidence.kind ===
              "item-drop",
        ).length,
    };
  }

  const itemClasses = [
    ...new Set(
      evidence.flatMap((item) =>
        item.evidence.itemIdentifier ===
        undefined
          ? []
          : [item.evidence.itemIdentifier]
      ),
    ),
  ].sort();

  const resolutions = itemClasses.map(
    (itemClass) => ({
      itemClass,
      resolution:
        resolveInventoryItemBehaviorContract(
          contract,
          { itemClass },
        ),
    }),
  );

  const resolutionByItem = new Map(
    resolutions.map((item) => [
      item.itemClass,
      item.resolution,
    ]),
  );

  const dropAssessments =
    evidence
      .filter(
        (item) =>
          item.evidence.kind ===
          "item-drop",
      )
      .map(
        (item): InventoryDropPolicyAssessment => {
          const identifier =
            item.evidence.itemIdentifier;

          if (identifier === undefined) {
            return {
              scriptId: item.scriptId,
              executionRegion:
                item.evidence.executionRegion,
              status: "unknown-item",
              matchedRuleIds: [],
              reason:
                "Drop operation item identity is runtime-dynamic; authored drop policy cannot be resolved statically.",
            };
          }

          const resolution =
            resolutionByItem.get(identifier)!;

          if (
            resolution.status !== "resolved" ||
            !resolution.rule
          ) {
            return {
              scriptId: item.scriptId,
              executionRegion:
                item.evidence.executionRegion,
              itemIdentifier: identifier,
              status: "uncovered",
              matchedRuleIds:
                resolution.matchedRuleIds,
              reason: resolution.reason,
            };
          }

          return {
            scriptId: item.scriptId,
            executionRegion:
              item.evidence.executionRegion,
            itemIdentifier: identifier,
            status:
              resolution.rule.dropAllowed
                ? "allowed"
                : "denied",
            matchedRuleIds:
              resolution.matchedRuleIds,
            reason:
              resolution.rule.dropAllowed
                ? "Authored item behavior contract allows this item class to be dropped."
                : "Authored item behavior contract denies dropping this item class.",
          };
        },
      )
      .sort((a, b) =>
        a.scriptId.localeCompare(b.scriptId) ||
        a.executionRegion.localeCompare(
          b.executionRegion,
        ) ||
        (a.itemIdentifier ?? "").localeCompare(
          b.itemIdentifier ?? "",
        ),
      );

  return {
    configured: true,
    contractId: contract.id,
    resolvedItemClasses:
      resolutions.filter(
        (item) =>
          item.resolution.status ===
          "resolved",
      ).length,
    uncoveredItemClasses:
      resolutions.filter(
        (item) =>
          item.resolution.status !==
          "resolved",
      ).length,
    unknownIdentityEvidence:
      evidence.filter(
        (item) =>
          item.evidence.itemIdentifier ===
          undefined,
      ).length,
    dropAssessments,
    deniedDrops:
      dropAssessments.filter(
        (item) => item.status === "denied",
      ).length,
    uncoveredDrops:
      dropAssessments.filter(
        (item) =>
          item.status === "uncovered",
      ).length,
    unknownDrops:
      dropAssessments.filter(
        (item) =>
          item.status === "unknown-item",
      ).length,
  };
}
