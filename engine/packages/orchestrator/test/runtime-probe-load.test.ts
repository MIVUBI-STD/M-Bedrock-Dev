import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  assertRuntimeProbeTranscriptArtifact,
  loadRuntimeProbeTranscript,
} from "../src/runtime-probe-load.js";

describe("runtime probe transcript loading", () => {
  it("loads and validates a trusted transcript", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-probe-load-"));
    try {
      const path = join(root, "probes.json");
      await writeFile(path, JSON.stringify({
        schemaVersion: 1,
        artifactId: "art-1",
        sessionId: "qa-1",
        exchanges: [{
          request: {
            schemaVersion: 1,
            requestId: "req-1",
            probeId: "chunk-ready",
            predicate: "loaded-target-chunk",
            scope: { operationId: "mutation-1" },
            runtimeTick: 90,
            query: {
              kind: "chunk-loaded",
              dimension: "overworld",
              location: { x: 0, y: 64, z: 0 },
            },
            outcomeByState: {
              present: "ready",
              absent: "not-ready",
            },
          },
          response: {
            schemaVersion: 1,
            requestId: "req-1",
            probeId: "chunk-ready",
            runtimeTick: 100,
            ok: true,
            state: "present",
            outcomeId: "ready",
            evidence: {
              predicate: "loaded-target-chunk",
              state: "present",
              confidence: "observed",
              scope: { operationId: "mutation-1" },
              observedAt: { tick: 100 },
            },
            value: true,
          },
        }],
      }), "utf8");

      const transcript = await loadRuntimeProbeTranscript(path);
      expect(transcript.exchanges).toHaveLength(1);
      expect(() =>
        assertRuntimeProbeTranscriptArtifact(transcript, "art-1")
      ).not.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects transcript evidence from another artifact", () => {
    expect(() => assertRuntimeProbeTranscriptArtifact({
      schemaVersion: 1,
      artifactId: "art-old",
      exchanges: [],
    }, "art-new")).toThrow(/does not match inspected artifact/);
  });
});
