import { describe, expect, it } from "vitest";
import { analyzeCommand } from "../src/parse.js";
import { flattenCommandEffects } from "../src/flatten.js";

const source = { artifactId: "art_demo", relativePath: "functions/demo.mcfunction" };

describe("command analyzer", () => {
  it("parses fill into a typed region effect", () => {
    const result = analyzeCommand("fill 8 -47 1 4 -50 1 spruce_wood", source);
    const effect = result.effects[0];
    expect(effect?.kind).toBe("fill");
    if (effect?.kind === "fill") {
      expect(effect.region.from.x).toEqual({ mode: "absolute", value: 8 });
      expect(effect.region.to.y).toEqual({ mode: "absolute", value: -50 });
      expect(effect.block).toBe("spruce_wood");
    }
  });

  it("recursively analyzes execute run commands", () => {
    const result = analyzeCommand(
      "execute as @a at @s run fill 1 2 3 4 5 6 stone",
      source,
    );
    const flat = flattenCommandEffects(result);
    expect(flat.some((effect) => effect.kind === "fill")).toBe(true);
  });

  it("preserves coordinate modes", () => {
    const result = analyzeCommand("tp @s ~1 ~ ^2", source);
    const effect = result.effects[0];
    expect(effect?.kind).toBe("teleport");
    if (effect?.kind === "teleport") {
      expect(effect.destination.x.mode).toBe("relative");
      expect(effect.destination.z.mode).toBe("local");
    }
  });
});
