import { describe, expect, it } from "vitest";
import { settleMutation } from "../src/app/mutation.js";

describe("Mutation state reconciliation", () => {
  it("refreshes after a successful operation", async () => {
    const calls: string[] = [];
    const result = await settleMutation(
      async () => { calls.push("operation"); },
      async () => { calls.push("refresh"); },
    );
    expect(calls).toEqual(["operation", "refresh"]);
    expect(result).toEqual({ operation: { ok: true }, refresh: { ok: true } });
  });

  it("refreshes after partial failure and retains the operation error", async () => {
    const error = new Error("second client failed");
    const calls: string[] = [];
    const result = await settleMutation(
      async () => { calls.push("operation"); throw error; },
      async () => { calls.push("refresh"); },
    );
    expect(calls).toEqual(["operation", "refresh"]);
    expect(result.operation).toEqual({ ok: false, error });
    expect(result.refresh).toEqual({ ok: true });
  });

  it("does not replace the operation error when refresh also fails", async () => {
    const operationError = new Error("rollback incomplete");
    const refreshError = new Error("provider unavailable");
    const result = await settleMutation(
      async () => { throw operationError; },
      async () => { throw refreshError; },
    );
    expect(result.operation).toEqual({ ok: false, error: operationError });
    expect(result.refresh).toEqual({ ok: false, error: refreshError });
  });

  it("reports a refresh failure separately after successful mutation", async () => {
    const error = new Error("status unavailable");
    const result = await settleMutation(async () => undefined, async () => { throw error; });
    expect(result.operation).toEqual({ ok: true });
    expect(result.refresh).toEqual({ ok: false, error });
  });

  it("treats even an undefined rejection as a failure", async () => {
    const result = await settleMutation(
      () => Promise.reject(undefined),
      async () => undefined,
    );
    expect(result.operation).toEqual({ ok: false, error: undefined });
    expect(result.refresh.ok).toBe(true);
  });
});
