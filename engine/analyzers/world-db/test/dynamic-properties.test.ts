import { describe, expect, it } from "vitest";
import { extractDynamicPropertyNamespaces } from "../src/dynamic-properties.js";

describe("dynamic property namespace extraction", () => {
  it("extracts only behavior-pack UUID namespaces", () => {
    expect(
      extractDynamicPropertyNamespaces({
        "8a121475-6f9f-4780-a746-2bf25f732204": {
          score: 10,
          ready: true,
        },
        metadata: "ignored",
      }),
    ).toEqual([
      {
        identity: "8a121475-6f9f-4780-a746-2bf25f732204",
        propertyIds: ["ready", "score"],
      },
    ]);
  });
});
