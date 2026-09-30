import { describe, expect, it } from "vitest";
import {
  analyzeWorldRuntimeState,
} from "../src/runtime-state-forensics.js";

describe("world runtime state forensics", () => {
  it("surfaces unscoped and persisted transient runtime state", () => {
    const report = analyzeWorldRuntimeState([
      {
        kind: "pending-structure",
        key: "arena-reset-3",
        active: true,
        persistent: true,
      },
    ]);

    expect(report.findings.map((item) => item.kind)).toEqual([
      "unscoped-arena-state",
      "persistent-transient-state",
      "unexpected-global-state",
    ]);
  });
});
