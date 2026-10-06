import { describe, expect, it } from "vitest";
import {
  deriveScriptInventoryLifecycleEvidence,
} from "../../../src/domains/inventory/inventory-lifecycle-evidence.js";

const source = {
  artifactId: "fixture",
  relativePath: "scripts/main.ts",
};

describe("inventory lifecycle evidence", () => {
  it("distinguishes full inventory clear from slot-level clear", () => {
    const result =
      deriveScriptInventoryLifecycleEvidence(
        [
          "function reset(container) {",
          "  container.clearAll();",
          "  container.setItem(0, undefined);",
          "}",
        ].join("\n"),
        source,
      );

    expect(
      result.map((item) => item.kind),
    ).toEqual(
      expect.arrayContaining([
        "inventory-clear-all",
        "inventory-clear-slot",
      ]),
    );
  });

  it("tracks ItemStack copy mutation and explicit writeback", () => {
    const result =
      deriveScriptInventoryLifecycleEvidence(
        [
          "function repair(container) {",
          "  const item = container.getItem(0);",
          "  if (!item) return;",
          "  item.nameTag = 'Repaired';",
          "  container.setItem(0, item);",
          "}",
        ].join("\n"),
        source,
      );

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "item-read",
          itemBinding: "item",
        }),
        expect.objectContaining({
          kind: "item-copy-mutation",
          itemBinding: "item",
        }),
        expect.objectContaining({
          kind: "item-writeback",
          itemBinding: "item",
        }),
      ]),
    );
  });

  it("captures equipment clear separately from inventory clear", () => {
    const result =
      deriveScriptInventoryLifecycleEvidence(
        [
          "function reset(equippable) {",
          "  equippable.setEquipment('Head', undefined);",
          "}",
        ].join("\n"),
        source,
      );

    expect(result[0]).toMatchObject({
      kind: "equipment-clear-slot",
      executionRegion: "function:reset",
      slotExpression: "'Head'",
    });
  });

  it("classifies addItem result handling without assuming grant success", () => {
    const result =
      deriveScriptInventoryLifecycleEvidence(
        [
          "function grantUnchecked(container, item) {",
          "  container.addItem(item);",
          "}",
          "function grantCaptured(container, item) {",
          "  const remainder = container.addItem(item);",
          "  if (remainder) return false;",
          "  return true;",
          "}",
          "function grantUncheckedCapture(container, item) {",
          "  const remainder = container.addItem(item);",
          "  return true;",
          "}",
          "function grantPropagated(container, item) {",
          "  return container.addItem(item);",
          "}",
        ].join("\n"),
        source,
      );

    expect(
      result.filter(
        (item) =>
          item.kind === "item-grant",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          executionRegion:
            "function:grantUnchecked",
          grantResultStatus:
            "unobserved",
        }),
        expect.objectContaining({
          executionRegion:
            "function:grantCaptured",
          grantResultBinding:
            "remainder",
          grantResultStatus: "checked",
        }),
        expect.objectContaining({
          executionRegion:
            "function:grantUncheckedCapture",
          grantResultBinding:
            "remainder",
          grantResultStatus:
            "captured-unchecked",
        }),
        expect.objectContaining({
          executionRegion:
            "function:grantPropagated",
          grantResultStatus:
            "propagated",
        }),
      ]),
    );
  });
});
