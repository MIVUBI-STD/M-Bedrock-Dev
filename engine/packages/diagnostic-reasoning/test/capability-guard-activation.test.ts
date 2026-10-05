import { describe, expect, it } from "vitest";
import { assessCapabilityExposure } from "../src/index.js";

describe("capability exposure guard activation", () => {
  it("does not credit a protection whose production registration is inactive", () => {
    const result = assessCapabilityExposure({
      capabilityId: "capability:inactive-protection",
      capabilityLabel: "Inactive Protection",
      releaseEnabled: "enabled",
      authorization: "required-and-enforced",
      guardActivation: "inactive",
      triggerPresent: true,
      playerImpact: "state",
    });

    expect(result.status).toBe("exposed");
  });

  it("keeps unknown production activation unresolved", () => {
    const result = assessCapabilityExposure({
      capabilityId: "capability:activation-unknown",
      capabilityLabel: "Activation Unknown",
      releaseEnabled: "enabled",
      authorization: "required-and-enforced",
      guardActivation: "unknown",
      triggerPresent: true,
      playerImpact: "progression",
    });

    expect(result.status).toBe("potentially-exposed");
  });

  it("credits an explicitly active production guard", () => {
    const result = assessCapabilityExposure({
      capabilityId: "capability:active-protection",
      capabilityLabel: "Active Protection",
      releaseEnabled: "enabled",
      authorization: "required-and-enforced",
      guardActivation: "active",
      triggerPresent: true,
      playerImpact: "progression",
    });

    expect(result.status).toBe("guarded");
  });
});
