import { describe, expect, it } from "vitest";
import { NORMAL_EXTRACTION_BUDGET } from "../src/budgets.js";
import { validateArchiveInventory } from "../src/inventory.js";

describe("validateArchiveInventory", () => {
  it("rejects duplicate normalized paths", () => {
    const result = validateArchiveInventory(
      [
        { path: "a/file.txt", compressedBytes: 10, expandedBytes: 20, isDirectory: false },
        { path: "a/file.txt", compressedBytes: 10, expandedBytes: 20, isDirectory: false },
      ],
      NORMAL_EXTRACTION_BUDGET,
    );

    expect(result.inventory).toBeUndefined();
    expect(result.findings.some((finding) => finding.code === "ARCHIVE_DUPLICATE_PATH")).toBe(true);
  });

  it("rejects suspicious expansion ratio", () => {
    const result = validateArchiveInventory(
      [
        {
          path: "db/huge.bin",
          compressedBytes: 1,
          expandedBytes: NORMAL_EXTRACTION_BUDGET.maxCompressionRatio + 1,
          isDirectory: false,
        },
      ],
      NORMAL_EXTRACTION_BUDGET,
    );

    expect(result.inventory).toBeUndefined();
  });
});
