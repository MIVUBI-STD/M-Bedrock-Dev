import { describe, expect, it } from "vitest";
import {
  parseErrorEnvelope,
  parseSuccessEnvelope,
  PUBLIC_CONTRACT_SCHEMA,
} from "../src/contracts.js";

const valuePayload = (value: unknown): value is { value: number } =>
  typeof value === "object" && value !== null && "value" in value && typeof value.value === "number";

describe("Virtual Clients public contract", () => {
  it("accepts schema 1 success envelopes", () => {
    const data = parseSuccessEnvelope<{ value: number }>(
      JSON.stringify({ schema: PUBLIC_CONTRACT_SCHEMA, data: { value: 7 } }),
      valuePayload,
    );
    expect(data).toEqual({ value: 7 });
  });

  it("rejects unknown success schemas", () => {
    expect(() =>
      parseSuccessEnvelope(JSON.stringify({ schema: 2, data: {} }), valuePayload),
    ).toThrow(/schema 1/i);
  });

  it("parses typed backend errors", () => {
    expect(
      parseErrorEnvelope(
        JSON.stringify({
          schema: 1,
          code: "INVALID_INPUT",
          message: "bad input",
          retryable: false,
        }),
      ),
    ).toEqual({
      schema: 1,
      code: "INVALID_INPUT",
      message: "bad input",
      retryable: false,
    });
  });

  it("does not reinterpret malformed errors", () => {
    expect(parseErrorEnvelope("not-json")).toBeUndefined();
    expect(
      parseErrorEnvelope(
        JSON.stringify({
          schema: 1,
          code: "INVALID_INPUT",
          message: "bad input",
        }),
      ),
    ).toBeUndefined();
  });
});

describe("Public payload validation", () => {
  it("rejects schema-valid but malformed data", () => {
    expect(() => parseSuccessEnvelope(
      JSON.stringify({ schema: 1, data: { value: "wrong" } }), valuePayload,
    )).toThrow(/command contract/i);
  });
});
