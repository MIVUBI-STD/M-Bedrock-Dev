import type {
  ParsedScriptFile,
  ScriptInventoryLifecycleEvidence,
} from "../../../../analyzers/scripts/src/index.js";

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
  knownEquipmentSlots: readonly string[];
  clearedEquipmentSlots: readonly string[];
  equipmentCoverageComplete: boolean;
  itemGrants: number;
  checkedItemGrants: number;
  unverifiedItemGrants: number;
  propagatedItemGrants: number;
  equipmentSets: number;
  itemDrops: number;
  copyMutations: readonly InventoryCopyMutationAssessment[];
  status: InventoryLifecycleRegionStatus;
}

export interface InventoryLifecycleAnalysisOptions {
  readonly requiresFullEquipmentReset?: boolean;
}

const FULL_PLAYER_EQUIPMENT_SLOTS = [
  "Head",
  "Chest",
  "Legs",
  "Feet",
  "Offhand",
] as const;

function normalizeEquipmentSlot(
  value: string,
): string {
  const trimmed = value.trim()
    .replace(/^["']|["']$/g, "");
  const tail = trimmed.split(".").at(-1) ?? trimmed;
  return tail.length === 0
    ? trimmed
    : tail[0]!.toUpperCase() +
      tail.slice(1).toLowerCase();
}

export interface InventoryLifecycleAnalysis {
  regions: number;
  resetCandidates: number;
  completeResets: number;
  partialResets: number;
  copyMutationRisks: number;
  grantVerificationGaps: number;
  grantRegions: number;
  dropRegions: number;
  knownEquipmentSlots: readonly string[];
  unresolvedEquipmentSlotEvidence: number;
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
  knownEquipmentSlots: readonly string[],
): InventoryLifecycleRegionAssessment {
  const inventoryClear = evidence.some(
    (item) => item.kind === "inventory-clear-all",
  );
  const clearedEquipmentSlots = [
    ...new Set(
      evidence.flatMap((item) =>
        item.kind === "equipment-clear-slot" &&
        item.slotExpression !== undefined
          ? [normalizeEquipmentSlot(item.slotExpression)]
          : [],
      ),
    ),
  ].sort();
  const equipmentClear =
    clearedEquipmentSlots.length > 0;
  const equipmentCoverageComplete =
    knownEquipmentSlots.every((slot) =>
      clearedEquipmentSlots.includes(slot)
    );
  const grantEvidence = evidence.filter(
    (item) => item.kind === "item-grant",
  );
  const itemGrants = grantEvidence.length;
  const checkedItemGrants =
    grantEvidence.filter(
      (item) =>
        item.grantResultStatus ===
        "checked",
    ).length;
  const unverifiedItemGrants =
    grantEvidence.filter(
      (item) =>
        item.grantResultStatus ===
          "unobserved" ||
        item.grantResultStatus ===
          "captured-unchecked",
    ).length;
  const propagatedItemGrants =
    grantEvidence.filter(
      (item) =>
        item.grantResultStatus ===
        "propagated",
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
      : inventoryClear &&
          equipmentCoverageComplete
        ? "complete-reset"
        : inventoryClear || equipmentClear
          ? "partial-reset"
          : "observed";

  return {
    scriptId,
    executionRegion,
    inventoryClear,
    equipmentClear,
    knownEquipmentSlots,
    clearedEquipmentSlots,
    equipmentCoverageComplete,
    itemGrants,
    checkedItemGrants,
    unverifiedItemGrants,
    propagatedItemGrants,
    equipmentSets,
    itemDrops,
    copyMutations: copies,
    status,
  };
}

export function analyzeInventoryLifecycle(
  scripts: readonly ParsedScriptFile[],
  options: InventoryLifecycleAnalysisOptions = {},
): InventoryLifecycleAnalysis {
  const allEvidence = scripts.flatMap(
    (script) =>
      script.inventoryLifecycleEvidence ?? [],
  );
  const knownEquipmentSlots = [
    ...new Set([
      ...allEvidence.flatMap((item) =>
        item.kind === "equipment-set" &&
        item.slotExpression !== undefined
          ? [normalizeEquipmentSlot(item.slotExpression)]
          : [],
      ),
      ...(options.requiresFullEquipmentReset
        ? FULL_PLAYER_EQUIPMENT_SLOTS
        : []),
    ]),
  ].sort();
  const unresolvedEquipmentSlotEvidence =
    allEvidence.filter(
      (item) =>
        (
          item.kind === "equipment-set" ||
          item.kind === "equipment-clear-slot"
        ) &&
        item.slotExpression === undefined,
    ).length;

  const assessments = scripts.flatMap((script) =>
    [...byRegion(script).entries()].map(
      ([region, evidence]) =>
        assessRegion(
          script.identifier,
          region,
          evidence,
          knownEquipmentSlots,
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
    grantVerificationGaps:
      assessments.reduce(
        (sum, item) =>
          sum +
          item.unverifiedItemGrants +
          item.propagatedItemGrants,
        0,
      ),
    grantRegions: assessments.filter(
      (item) => item.itemGrants > 0,
    ).length,
    dropRegions: assessments.filter(
      (item) => item.itemDrops > 0,
    ).length,
    knownEquipmentSlots,
    unresolvedEquipmentSlotEvidence,
    assessments,
  };
}
