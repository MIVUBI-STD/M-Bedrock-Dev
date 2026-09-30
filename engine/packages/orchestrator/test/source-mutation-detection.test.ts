import { describe, expect, it } from "vitest";
import {
  runCommandMutationCampaign,
} from "../src/mutation-campaign.js";

describe("source mutation detection through real analyzers", () => {
  it("kills selector broadening using state-scope analysis", async () => {
    const result = await runCommandMutationCampaign({
      identifier: "scope",
      relativePath: "behavior_packs/demo/functions/scope.mcfunction",
      commands: [
        "scoreboard players set @a[tag=arena1] active 1",
      ],
      knownObjectives: ["active"],
      knownTags: ["arena1"],
    });

    expect(result.report.results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        descriptor: expect.objectContaining({ operator: "selector-broaden" }),
        status: "killed",
      }),
    ]));
  });

  it("kills structure reference redirect using known-reference evidence", async () => {
    const result = await runCommandMutationCampaign({
      identifier: "refs",
      relativePath: "behavior_packs/demo/functions/refs.mcfunction",
      commands: [
        "structure load demo:arena 0 0 0",
      ],
      knownStructures: ["demo:arena"],
    });

    expect(result.report.results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        descriptor: expect.objectContaining({ operator: "structure-reference-redirect" }),
        status: "killed",
      }),
    ]));
  });

  it("kills coordinate shifts when repeated topology exposes the mutation", async () => {
    const result = await runCommandMutationCampaign({
      identifier: "topology",
      relativePath: "behavior_packs/demo/functions/topology.mcfunction",
      commands: [
        "fill 0 0 0 3 2 3 stone",
        "fill 100 0 0 103 2 3 stone",
        "fill 200 0 0 203 2 3 stone",
        "fill 300 0 0 303 2 3 stone",
        "fill 400 0 0 403 2 3 stone",
      ],
    });

    expect(result.report.results.some((item) =>
      item.descriptor.operator === "coordinate-shift" &&
      item.status === "killed",
    )).toBe(true);
  });

  it("surfaces operators not distinguished by current detectors", async () => {
    const result = await runCommandMutationCampaign({
      identifier: "single",
      relativePath: "behavior_packs/demo/functions/single.mcfunction",
      commands: [
        "fill 0 0 0 1 1 1 stone",
      ],
    });

    expect(result.survivedOperators).toContain("coordinate-shift");
  });
});
