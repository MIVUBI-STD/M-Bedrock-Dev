import { describe, expect, it } from "vitest";
import type { ResolvedEffect } from "../src/effect-resolution.js";
import { effectSignature, translationBetween } from "../src/signature.js";

describe("topology effect signature", () => {
  it("anchors clone translation at destination rather than source template", () => {
    const a: ResolvedEffect = {
      kind: "clone",
      from: { x: 1000, y: 0, z: 1000 },
      to: { x: 1009, y: 9, z: 1009 },
      destination: { x: 0, y: 0, z: 0 },
      sourcePath: "setup.mcfunction",
    };
    const b: ResolvedEffect = {
      kind: "clone",
      from: { x: 1000, y: 0, z: 1000 },
      to: { x: 1009, y: 9, z: 1009 },
      destination: { x: 100, y: 0, z: 0 },
      sourcePath: "setup.mcfunction",
    };

    expect(
      translationBetween(
        effectSignature(a),
        effectSignature(b),
      ),
    ).toEqual({ x: 100, y: 0, z: 0 });
  });
});
