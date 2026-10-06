import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isOperationProgress, operationProgressLabel } from "../src/app/operationProgress.js";

describe("Backend command activity", () => {
  it("accepts only the current versioned activity shape", () => {
    for (const phase of ["EXECUTING", "SUCCEEDED", "FAILED"]) {
      expect(isOperationProgress({ schema: 2, operation: "start-client", phase })).toBe(true);
    }
    for (const value of [
      null,
      [],
      {},
      { schema: 1, operation: "start-client", phase: "EXECUTING" },
      { schema: 2, operation: "", phase: "EXECUTING" },
      { schema: 2, operation: "start-client", phase: "BOOTED" },
    ]) {
      expect(isOperationProgress(value)).toBe(false);
    }
  });

  it("uses user-facing activity labels without invented percent progress", () => {
    expect(operationProgressLabel({ schema: 2, operation: "start-client", phase: "EXECUTING" })).toBe("Starting virtual client…");
    expect(operationProgressLabel({ schema: 2, operation: "set-ready", phase: "EXECUTING" })).toBe("Saving recovery point…");
    expect(operationProgressLabel({ schema: 2, operation: "unknown-future-operation", phase: "EXECUTING" })).toBe("Working…");
    expect(operationProgressLabel({ schema: 2, operation: "start-client", phase: "SUCCEEDED" })).toContain("checking current state");
    expect(operationProgressLabel(undefined)).toContain("Waiting");
    expect(operationProgressLabel({ schema: 2, operation: "start-client", phase: "FAILED" })).not.toMatch(/ready|100%|backend/i);
  });

  it("isolates channels and ignores late events after invocation settlement", () => {
    const source = readFileSync(new URL("../src/app/bridge/virtualClientsApi.ts", import.meta.url), "utf8");
    expect(source).toContain("new Channel<unknown>()");
    expect(source.indexOf("channel.onmessage = (event)")).toBeLessThan(source.indexOf("await invokeRuntime<string>"));
    expect(source).toContain("if (active)");
    expect(source).toContain("active = false;");
    expect(source).toContain("channel.onmessage = () => {}");
    expect(source).toContain("isOperationProgress(event) ? event : undefined");
  });

  it("keeps routine refresh bounded to current state instead of static/history reads", () => {
    const source = readFileSync(new URL("../src/App.svelte", import.meta.url), "utf8");
    expect(source).toContain("settleMutation(");
    expect(source).toContain('operationStatus = "Refreshing current client state…";');
    expect(source).toContain("policy ? Promise.resolve(policy) : backend.policy()");
    expect(source).toContain('if (next === "support" && !busy && !loading) void loadHistory();');
    const loadState = source.slice(source.indexOf("async function loadState()"), source.indexOf("async function refresh()"));
    expect(loadState).not.toContain("backend.history()");
    expect(source).toContain("if (!disposed) operationStatus");
    expect(source).toContain("disposed = true;");
    expect(source).not.toContain("setInterval");
  });
});
