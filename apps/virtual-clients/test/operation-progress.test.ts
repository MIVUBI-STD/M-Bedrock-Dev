import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isOperationProgress, operationProgressLabel } from "../src/app/operationProgress.js";

describe("Backend command activity", () => {
  it("accepts only versioned known phases", () => {
    for (const phase of ["EXECUTING", "SUCCEEDED", "FAILED"]) {
      expect(isOperationProgress({ schema: 1, phase })).toBe(true);
    }
    for (const value of [null, [], {}, { schema: 2, phase: "EXECUTING" }, { schema: 1, phase: "BOOTED" }]) {
      expect(isOperationProgress(value)).toBe(false);
    }
  });

  it("does not turn activity into readiness or percent completion", () => {
    expect(operationProgressLabel({ schema: 1, phase: "EXECUTING" })).toContain("executing the command");
    expect(operationProgressLabel({ schema: 1, phase: "SUCCEEDED" })).toContain("waiting for the command result");
    expect(operationProgressLabel(undefined)).toContain("Progress unavailable");
    expect(operationProgressLabel({ schema: 1, phase: "FAILED" })).not.toMatch(/ready|100%/i);
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

  it("retains mutation reconciliation and discards progress after teardown", () => {
    const source = readFileSync(new URL("../src/App.svelte", import.meta.url), "utf8");
    expect(source).toContain("settleMutation(");
    expect(source).toContain('operationStatus = "Refreshing current client state…";');
    expect(source).toContain("if (!disposed) operationStatus");
    expect(source).toContain("disposed = true;");
    expect(source).not.toContain("setInterval");
  });
});
