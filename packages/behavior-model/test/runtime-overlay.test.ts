import { describe, expect, it } from "vitest";
import {
  projectPolicyProvenance,
  resolveMinecraftSemanticClaim,
  validateMinecraftSemanticOverlays,
  type MinecraftSemanticOverlay,
} from "../src/index.js";

const provenance = projectPolicyProvenance(
  "spec:runtime-overlay-test",
);

const bedrock: MinecraftSemanticOverlay = {
  schemaVersion: 1,
  id: "bedrock-retail",
  runtimeClass: "bedrock-retail-client",
  claims: [{
    id: "scheduler:example",
    domain: "scheduler",
    statement:
      "Example scheduler semantic claim.",
    disposition: "affirmed",
    provenance,
  }],
};

const education: MinecraftSemanticOverlay = {
  schemaVersion: 1,
  id: "education",
  runtimeClass: "education-host",
  claims: [],
};

describe("minecraft semantic runtime overlays", () => {
  it("does not inherit Bedrock claims into Education implicitly", () => {
    const resolved =
      resolveMinecraftSemanticClaim(
        "education",
        "scheduler:example",
        [bedrock, education],
      );

    expect(resolved.errors)
      .toEqual([]);
    expect(resolved.resolved)
      .toBeUndefined();
  });

  it("permits only claim-by-claim explicit inheritance", () => {
    const explicit: MinecraftSemanticOverlay = {
      ...education,
      inherits: [{
        fromOverlayId: "bedrock-retail",
        claimIds: [
          "scheduler:example",
        ],
      }],
    };

    const resolved =
      resolveMinecraftSemanticClaim(
        "education",
        "scheduler:example",
        [bedrock, explicit],
      );

    expect(resolved).toMatchObject({
      resolved: {
        inherited: true,
        sourceOverlayId:
          "bedrock-retail",
        claim: {
          disposition: "affirmed",
        },
      },
      errors: [],
    });
  });

  it("rejects inheritance declarations with no explicit claim list", () => {
    const invalid: MinecraftSemanticOverlay = {
      ...education,
      inherits: [{
        fromOverlayId: "bedrock-retail",
        claimIds: [],
      }],
    };

    expect(
      validateMinecraftSemanticOverlays(
        [bedrock, invalid],
      ).join(" "),
    ).toMatch(/must list explicit claimIds/);
  });
});
