import { describe, expect, it } from "vitest";
import { analyzeCommand, commandRuntimeEvidence } from "../src/index.js";

const source = { artifactId: "a", relativePath: "functions/test.mcfunction" };

describe("command runtime evidence", () => {
  it("emits structure mutation predicates conservatively", () => {
    const analysis = analyzeCommand(
      "structure load arena 0 64 0 0_degrees none layer_by_layer 2 true true false 50",
      source,
    );
    const records = commandRuntimeEvidence(analysis);
    const predicates = records.map((record) => record.predicate);
    expect(predicates).toContain("structure-placement-request");
    expect(predicates).toContain("world-mutation-request");
    expect(predicates).toContain("animated-structure-load");
    expect(predicates).toContain("partial-integrity-structure-load");
    expect(records.find((r) => r.predicate === "structure-entities-included")?.state)
      .toBe("present");
    expect(predicates).not.toContain("post-placement-readiness-verification");
  });

  it("emits block and teleport intent without inventing runtime success", () => {
    const fill = commandRuntimeEvidence(analyzeCommand("fill 0 0 0 1 1 1 stone", source));
    expect(fill.map((r) => r.predicate)).toEqual(expect.arrayContaining([
      "block-write", "world-mutation-request",
    ]));

    const tp = commandRuntimeEvidence(analyzeCommand("tp @s 1 2 3", source));
    expect(tp.map((r) => r.predicate)).toEqual(expect.arrayContaining([
      "teleport-destination", "teleport-apply-request",
    ]));
    expect(tp.map((r) => r.predicate)).not.toContain("verified-location");
  });
});