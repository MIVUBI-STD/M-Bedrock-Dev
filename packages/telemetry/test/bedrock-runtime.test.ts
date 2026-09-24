import { describe, expect, it } from "vitest";
import {
  createBedrockTelemetryRuntime,
  createBufferedTelemetrySink,
  createTelemetryFlushController,
} from "../src/index.js";

describe("Bedrock telemetry runtime bridge", () => {
  it("reads currentTick lazily and merges the runtime scope lease", () => {
    const system = { currentTick: 10 };
    const buffer = createBufferedTelemetrySink();
    const runtime = createBedrockTelemetryRuntime({
      system,
      sink: buffer,
      streamId: "bedrock-runtime",
      baseScope: { subsystemGeneration: 1 },
    });

    runtime.scope.replace({
      arenaId: "arena-1",
      arenaGeneration: 4,
    });

    const first = runtime.telemetry.routeRevalidation({
      routeId: "bridge",
      result: "passed",
    });
    expect(first.tick).toBe(10);
    expect(first.scope).toEqual({
      subsystemGeneration: 1,
      arenaId: "arena-1",
      arenaGeneration: 4,
    });

    system.currentTick = 11;
    runtime.scope.patch({ operationId: "mutation-1" });
    const second = runtime.telemetry.mutationApplied({
      mutationKind: "fill",
    });
    expect(second.tick).toBe(11);
    expect(second.scope.operationId).toBe("mutation-1");
  });

  it("retains buffered events when a flush transport throws", () => {
    const buffer = createBufferedTelemetrySink();
    const runtime = createBedrockTelemetryRuntime({
      system: { currentTick: 1 },
      sink: buffer,
    });
    runtime.telemetry.routeRevalidation({
      routeId: "bridge",
      result: "failed",
    });

    const controller = createTelemetryFlushController({
      buffer,
      transport: {
        send() {
          throw new Error("transport unavailable");
        },
      },
      sessionId: "run-1",
    });

    expect(() => controller.flush()).toThrow(/transport unavailable/);
    expect(buffer.size).toBe(1);
  });

  it("clears buffered events only after a successful flush", () => {
    const buffer = createBufferedTelemetrySink();
    const runtime = createBedrockTelemetryRuntime({
      system: { currentTick: 1 },
      sink: buffer,
    });
    runtime.telemetry.routeRevalidation({
      routeId: "bridge",
      result: "passed",
    });

    const sent: unknown[] = [];
    const controller = createTelemetryFlushController({
      buffer,
      transport: {
        send(batch) {
          sent.push(batch);
        },
      },
      sessionId: "run-1",
      artifactId: "art-1",
    });

    const batch = controller.flush();
    expect(batch?.sessionId).toBe("run-1");
    expect(batch?.artifactId).toBe("art-1");
    expect(sent).toHaveLength(1);
    expect(buffer.size).toBe(0);
  });
});
