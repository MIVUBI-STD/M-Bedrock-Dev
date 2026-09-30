import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { inspectDirectory } from "../src/inspect.js";

describe("inspection evidence integrity", () => {
  it("keeps telemetry and runtime-probe continuity independent", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-integrity-"));
    try {
      const functions = join(root, "behavior_pack", "functions");
      await mkdir(functions, { recursive: true });
      await writeFile(
        join(functions, "noop.mcfunction"),
        "say ready\n",
        "utf8",
      );

      const result = await inspectDirectory(
        root,
        "artifact-integrity",
        { edition: "bedrock" },
        "fingerprint-integrity",
        undefined,
        [],
        [{
          schemaVersion: 1,
          eventId: "telemetry-1",
          kind: "route-revalidation",
          producer: "runtime",
          scope: { operationId: "route-1" },
          tick: 10,
          streamId: "telemetry-main",
          sequence: 1,
          routeId: "bridge",
          result: "passed",
        }],
        0,
        [{
          schemaVersion: 1,
          requestId: "probe-1",
          probeId: "chunk-ready",
          ok: true,
          state: "present",
          runtimeTick: 10,
          evidence: {
            predicate: "chunk-ready",
            state: "present",
            confidence: "observed",
            scope: { operationId: "probe-op" },
          },
        }],
        1,
      );

      expect(result.evidenceIntegrity.telemetry.continuityComplete)
        .toBe(true);
      expect(result.evidenceIntegrity.telemetry.safeForTemporalViolationClaims)
        .toBe(true);

      expect(result.evidenceIntegrity.runtimeProbe.continuityComplete)
        .toBe(false);
      expect(result.evidenceIntegrity.runtimeProbe.safeForCurrentStateClaims)
        .toBe(true);
      expect(result.evidenceIntegrity.runtimeProbe.safeForTemporalViolationClaims)
        .toBe(false);
      expect(result.evidenceIntegrity.runtimeProbe.reasons.join(" "))
        .toMatch(/probe exchanges were dropped/i);
      expect(result.evidenceRecovery.required).toBe(true);
      expect(result.evidenceRecovery.actions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          channel: "runtime-probe",
          kind: "rerun-runtime-probe-bundle",
        }),
      ]));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports telemetry temporal integrity unsafe when the stream has a gap", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-integrity-gap-"));
    try {
      await mkdir(join(root, "behavior_pack", "functions"), {
        recursive: true,
      });
      await writeFile(
        join(root, "behavior_pack", "functions", "noop.mcfunction"),
        "say ready\n",
        "utf8",
      );

      const result = await inspectDirectory(
        root,
        "artifact-integrity-gap",
        { edition: "bedrock" },
        "fingerprint-integrity-gap",
        undefined,
        [],
        [{
          schemaVersion: 1,
          eventId: "event-1",
          kind: "route-revalidation",
          producer: "runtime",
          scope: { operationId: "route-1" },
          tick: 10,
          streamId: "telemetry-main",
          sequence: 1,
          routeId: "bridge",
          result: "passed",
        }, {
          schemaVersion: 1,
          eventId: "event-3",
          kind: "route-revalidation",
          producer: "runtime",
          scope: { operationId: "route-1" },
          tick: 12,
          streamId: "telemetry-main",
          sequence: 3,
          routeId: "bridge",
          result: "passed",
        }],
      );

      expect(result.evidenceIntegrity.telemetry.continuityComplete)
        .toBe(false);
      expect(result.evidenceIntegrity.telemetry.safeForCurrentStateClaims)
        .toBe(true);
      expect(result.evidenceIntegrity.telemetry.safeForTemporalViolationClaims)
        .toBe(false);
      expect(result.evidenceRecovery.actions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          channel: "telemetry",
          kind: "recapture-continuous-stream",
        }),
      ]));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("marks unlocated telemetry unsafe for temporal claims even without sequence gaps", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-integrity-unlocated-"));
    try {
      await mkdir(join(root, "behavior_pack", "functions"), {
        recursive: true,
      });
      await writeFile(
        join(root, "behavior_pack", "functions", "noop.mcfunction"),
        "say ready\n",
        "utf8",
      );

      const result = await inspectDirectory(
        root,
        "artifact-unlocated",
        { edition: "bedrock" },
        "fingerprint-unlocated",
        undefined,
        [],
        [{
          schemaVersion: 1,
          eventId: "unlocated-1",
          kind: "route-revalidation",
          producer: "qa",
          scope: { operationId: "route-1" },
          routeId: "bridge",
          result: "failed",
        }],
      );

      expect(result.telemetryAnalysis.continuity.incomplete).toBe(false);
      expect(result.evidenceIntegrity.telemetry.unlocatedObservedRecords)
        .toBeGreaterThan(0);
      expect(result.evidenceIntegrity.telemetry.continuityComplete)
        .toBe(true);
      expect(result.evidenceIntegrity.telemetry.safeForCurrentStateClaims)
        .toBe(true);
      expect(result.evidenceIntegrity.telemetry.safeForTemporalViolationClaims)
        .toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
