import { describe, expect, it } from "vitest";
import { structureIdentifier } from "../src/inspect.js";

describe("structureIdentifier", () => {
  it("maps structures/<namespace>/<name>.mcstructure to namespace:name", () => {
    expect(
      structureIdentifier("behavior_packs/demo/structures/demo/test.mcstructure"),
    ).toBe("demo:test");
  });

  it("preserves nested names below the namespace", () => {
    expect(
      structureIdentifier("behavior_packs/demo/structures/demo/rooms/test.mcstructure"),
    ).toBe("demo:rooms/test");
  });

  it("keeps root-level structures as an unnamespaced identifier candidate", () => {
    expect(
      structureIdentifier("behavior_packs/demo/structures/test.mcstructure"),
    ).toBe("test");
  });
});
