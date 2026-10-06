import { describe, expect, it } from "vitest";
import { presentRuntimeError } from "../src/app/runtimeErrorPresentation.js";

describe("Virtual Clients runtime error presentation", () => {
  it("keeps machine detail separate from user copy", () => {
    const error = Object.assign(new Error("Virtual-01 Guest Agent did not become ready within 30s"), {
      code: "TIMEOUT",
      retryable: true,
    });

    expect(presentRuntimeError(error)).toEqual({
      title: "Operation took too long",
      message: "The virtual client did not reach the expected state in time.",
      details: "Virtual-01 Guest Agent did not become ready within 30s",
      retryable: true,
    });
  });

  it("fails closed for unknown error codes", () => {
    const result = presentRuntimeError(
      Object.assign(new Error("unexpected runtime detail"), {
        code: "NEW_BACKEND_ERROR",
        retryable: false,
      }),
    );
    expect(result.title).toMatch(/could not complete/i);
    expect(result.details).toBe("unexpected runtime detail");
    expect(result.retryable).toBe(false);
  });
});
