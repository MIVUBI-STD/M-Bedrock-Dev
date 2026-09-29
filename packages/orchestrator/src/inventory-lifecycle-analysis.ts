import type {
  ParsedScriptFile,
  ScriptInventoryLifecycleEvidence,
} from "../../../analyzers/scripts/src/index.js";

export type InventoryLifecycleRegionStatus =
  | "complete-reset"
  | "partial-reset"
  | "copy-writeback-risk"
  | "observed";

export interface InventoryCopyMutationAssessment {
  itemBinding: string;
  mutationCount: number;
  writebackCount: number;
  status: "written-back" | "missing-writeback";
}

export interface InventoryLifecycleRegionAssessment {
  scriptId: string;
  executionRegion: string;
  inventoryClear: boolean;
  equipmentClear: boolean;
  itemGrants: number;
  equipmentSets: number;
  itemDrops: number;
  copyMutations: readonly InventoryCopyMutationAssessment[];
  status: InventoryLifecycleRegionStatus;
}

export interface InventoryLifecycleAnalysis {
  regions: number;
  resetCandidates: number;
  completeResets: number;
  partialResets: number;
  copyMutationRisks: number;
  grantRegions: number;
  dropRegions: number;
  assessments: readonly InventoryLifecycleRegionAssessment[];
}

function byRegion(
  script: ParsedScriptFile,
): Map<string, ScriptInventoryLifecycleEvidence[]> {
  const output = new Map<
    string,
    ScriptInventoryLifecycleEvidence[]
  >();
  for (
    const evidence of
      script.inventoryLifecycleEvidence ?? []
  ) {
    const list =
      output.get(evidence.executionRegion) ?? [];
    list.push(evidence);
    output.set(evidence.executionRegion, list);
  }
  return output;
}

function copyAssessments(
  evidence: readonly ScriptInventoryLifecycleEvidence[],
): InventoryCopyMutationAssessment[] {
  const mutations = new Map<string, number>();
  const writebacks = new Map<string, number>();

  for (const item of evidence) {
    if (!item.itemBinding) continue;
    if (item.kind === "item-copy-mutation") {
      mutations.set(
        item.itemBinding,
        (mutations.get(item.itemBinding) ?? 0) + 1,
      );
    }
    if (item.kind === "item-writeback") {
      writebacks.set(
        item.itemBinding,
        (writebacks.get(item.itemBinding) ?? 0) + 1,
      );
    }
  }

  return [...mutations.entries()]
    .map(([itemBinding, mutationCount]) => {
      const writebackCount =
        writebacks.get(itemBinding) ?? 0;
      return {
        itemBinding,
        mutationCount,
        writebackCount,
        status:
          writebackCount > 0
            ? "written-back" as const
            : "missing-writeback" as const,
      };
    })
    .sort((a, b) =>
      a.itemBinding.localeCompare(b.itemBinding)
    );
}

function assessRegion(
  scriptId: string,
  executionRegion: string,
  evidence: readonly ScriptInventoryLifecycleEvidence[],
): InventoryLifecycleRegionAssessment {
  const inventoryClear = evidence.some(
    (item) => item.kind === "inventory-clear-all",
  );
  const equipmentClear = evidence.some(
    (item) => item.kind === "equipment-clear",
  );
  const itemGrants = evidence.filter(
    (item) => item.kind === "item-grant",
  ).length;
  const equipmentSets = evidence.filter(
    (item) => item.kind === "equipment-set",
  ).length;
  const itemDrops = evidence.filter(
    (item) => item.kind === "item-drop",
  ).length;
  const copies = copyAssessments(evidence);
  const copyRisk = copies.some(
    (item) => item.status === "missing-writeback",
  );

  const status: InventoryLifecycleRegionStatus =
    copyRisk
      ? "copy-writeback-risk"
      : inventoryClear && equipmentClear
        ? "complete-reset"
        : inventoryClear || equipmentClear
          ? "partial-reset"
          : "observed";

  return {
    scriptId,
    executionRegion,
    inventoryClear,
    equipmentClear,
    itemGrants,
    equipmentSets,
    itemDrops,
    copyMutations: copies,
    status,
  };
}

export function analyzeInventoryLifecycle(
  scripts: readonly ParsedScriptFile[],
): InventoryLifecycleAnalysis {
  const assessments = scripts.flatMap((script) =>
    [...byRegion(script).entries()].map(
      ([region, evidence]) =>
        assessRegion(
          script.identifier,
          region,
          evidence,
        ),
    )
  ).sort((a, b) =>
    a.scriptId.localeCompare(b.scriptId) ||
    a.executionRegion.localeCompare(
      b.executionRegion,
    )
  );

  return {
    regions: assessments.length,
    resetCandidates: assessments.filter(
      (item) =>
        item.inventoryClear ||
        item.equipmentClear,
    ).length,
    completeResets: assessments.filter(
      (item) =>
        item.status === "complete-reset",
    ).length,
    partialResets: assessments.filter(
      (item) =>
        item.status === "partial-reset",
    ).length,
    copyMutationRisks: assessments.reduce(
      (sum, item) =>
        sum +
        item.copyMutations.filter(
          (copy) =>
            copy.status ===
            "missing-writeback",
        ).length,
      0,
    ),
    grantRegions: assessments.filter(
      (item) => item.itemGrants > 0,
    ).length,
    dropRegions: assessments.filter(
      (item) => item.itemDrops > 0,
    ).length,
    assessments,
  };
}
