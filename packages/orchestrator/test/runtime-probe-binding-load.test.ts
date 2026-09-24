import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadRuntimeProbeBindings } from "../src/runtime-probe-binding-load.js";

describe("runtime probe binding loader", () => {
  it("loads a validated binding registry", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-bindings-"));
    try {
      const path = join(root, "bindings.json");
      await writeFile(path, JSON.stringify({
        schemaVersion: 1,
        bindings: [{
          probeId: "chunk-ready",
          predicate: "loaded-target-chunk",
          query: {
            kind: "chunk-loaded",
            dimension: "overworld",
            location: { x: 0, y: 64, z: 0 },
          },
          outcomeByState: {
            present: "ready",
            absent: "not-ready",
          },
        }],
      }), "utf8");

      const result = await loadRuntimeProbeBindings(path);
      expect(result.bindings).toHaveLength(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects malformed binding registries", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-bindings-bad-"));
    try {
      const path = join(root, "bindings.json");
      await writeFile(path, JSON.stringify({
        schemaVersion: 1,
        bindings: [{
          probeId: "chunk-ready",
          predicate: "loaded-target-chunk",
          query: {
            kind: "chunk-loaded",
            dimension: "",
            location: { x: 0, y: 64, z: 0 },
          },
          outcomeByState: {
            present: "ready",
            absent: "not-ready",
          },
        }],
      }), "utf8");

      await expect(loadRuntimeProbeBindings(path))
        .rejects.toThrow(/Invalid runtime probe binding set/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
