import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import {
  analyzeInventoryLifecycle,
} from "../../src/inspection/inventory-lifecycle-analysis.js";

describe("inventory lifecycle analysis", () => {
  it("accepts inventory-only reset when the map has no equipment surface", () => {
    const script = parseScriptFile(
      "main",
      [
        "function reset(container) {",
        "  container.clearAll();",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeInventoryLifecycle([script]);

    expect(result).toMatchObject({
      resetCandidates: 1,
      completeResets: 1,
      partialResets: 0,
      copyMutationRisks: 0,
      knownEquipmentSlots: [],
    });
  });

  it("marks inventory and equipment reset in the same region as complete", () => {
    const script = parseScriptFile(
      "main",
      [
        "function reset(container, equippable) {",
        "  container.clearAll();",
        "  equippable.setEquipment('Head', undefined);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeInventoryLifecycle([script]);

    expect(result.assessments[0]).toMatchObject({
      executionRegion: "function:reset",
      status: "complete-reset",
      inventoryClear: true,
      equipmentClear: true,
    });
  });

  it("keeps equipment reset partial when authored equipment slots are not all cleared", () => {
    const script = parseScriptFile(
      "main",
      [
        "function equip(equippable, head, offhand) {",
        "  equippable.setEquipment('Head', head);",
        "  equippable.setEquipment('Offhand', offhand);",
        "}",
        "function reset(container, equippable) {",
        "  container.clearAll();",
        "  equippable.setEquipment('Head', undefined);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeInventoryLifecycle([script]);
    const reset = result.assessments.find(
      (item) =>
        item.executionRegion ===
        "function:reset",
    );

    expect(result.knownEquipmentSlots).toEqual([
      "'Head'",
      "'Offhand'",
    ]);
    expect(reset).toMatchObject({
      status: "partial-reset",
      equipmentCoverageComplete: false,
      clearedEquipmentSlots: ["'Head'"],
    });
  });

  it("flags a mutated ItemStack copy without writeback", () => {
    const script = parseScriptFile(
      "main",
      [
        "function damage(container) {",
        "  const item = container.getItem(0);",
        "  if (!item) return;",
        "  item.nameTag = 'Changed';",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeInventoryLifecycle([script]);

    expect(result.copyMutationRisks).toBe(1);
    expect(
      result.assessments[0]?.copyMutations[0],
    ).toMatchObject({
      itemBinding: "item",
      status: "missing-writeback",
    });
  });
  it("does not treat inventory-only reset as complete when Creative access can mutate equipment", () => {
    const script = parseScriptFile(
      "main",
      [
        "function reset(container) {",
        "  container.clearAll();",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const normal = analyzeInventoryLifecycle([script]);
    const creative = analyzeInventoryLifecycle(
      [script],
      { requiresFullEquipmentReset: true },
    );

    expect(normal.completeResets).toBe(1);
    expect(creative.completeResets).toBe(0);
    expect(creative.partialResets).toBe(1);
    expect(creative.knownEquipmentSlots).toEqual(
      expect.arrayContaining([
        "Head",
        "Chest",
        "Legs",
        "Feet",
        "Offhand",
      ]),
    );
  });

  it("keeps addItem success unresolved until the remainder/result is checked", () => {
    const script = parseScriptFile(
      "main",
      [
        "function unchecked(container, item) {",
        "  container.addItem(item);",
        "}",
        "function checked(container, item) {",
        "  const remainder = container.addItem(item);",
        "  if (remainder) return false;",
        "  return true;",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeInventoryLifecycle([script]);

    expect(result.grantVerificationGaps)
      .toBe(1);
    expect(
      result.assessments.find(
        (item) =>
          item.executionRegion ===
          "function:unchecked",
      ),
    ).toMatchObject({
      itemGrants: 1,
      unverifiedItemGrants: 1,
      checkedItemGrants: 0,
    });
    expect(
      result.assessments.find(
        (item) =>
          item.executionRegion ===
          "function:checked",
      ),
    ).toMatchObject({
      itemGrants: 1,
      unverifiedItemGrants: 0,
      checkedItemGrants: 1,
    });
  });
});
