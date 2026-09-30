import { describe, expect, it } from "vitest";
import { parseMcFunction, functionRuntimeEvidence } from "../src/index.js";

describe("function runtime evidence", () => {
  it("aggregates command evidence and preserves line provenance", () => {
    const fn = parseMcFunction(
      "test:arena",
      "structure load test:arena 0 64 0\nfill 0 0 0 1 1 1 stone",
      { artifactId: "a", relativePath: "functions/arena.mcfunction" },
    );
    const records = functionRuntimeEvidence(fn);
    expect(records.some((record) => record.predicate === "mcfunction")).toBe(true);
    const structure = records.find((record) => record.predicate === "structure-placement-request");
    expect(structure?.sourceRefs?.[0]?.range?.lineStart).toBe(1);
    const blockWrite = records.find((record) => record.predicate === "block-write");
    expect(blockWrite?.sourceRefs?.[0]?.range?.lineStart).toBe(2);
  });
});