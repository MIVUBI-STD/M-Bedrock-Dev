import { describe, expect, it } from "vitest";
import { actionLabel } from "../src/view-model.js";
import { setupExperience, setupPhaseIndex } from "../src/app/setupFlow.js";

describe("Virtual Clients first-run presentation", () => {
  it("keeps backend nextSetupAction as the only setup input", () => {
    expect(setupExperience("REGISTER_BASE").owner).toBe("APP");
    expect(setupExperience("FINALIZE_BASE").owner).toBe("USER");
    expect(setupExperience("VERIFY_IDENTITIES").owner).toBe("CLIENTS");
    expect(setupExperience("RUNTIME_DATA_INCOMPATIBLE").owner).toBe("BLOCKED");
  });

  it("does not claim Base or Sysprep work is automated", () => {
    expect(setupExperience("PREPARE_BASE").owner).toBe("USER");
    expect(setupExperience("FINALIZE_BASE").steps.join(" ")).toMatch(/finalization|generalize/i);
  });

  it("projects a monotonic four-phase setup view", () => {
    expect(setupPhaseIndex("INSTALL_PROVIDER")).toBe(0);
    expect(setupPhaseIndex("REGISTER_BASE")).toBe(1);
    expect(setupPhaseIndex("PROVISION_VIRTUALS")).toBe(2);
    expect(setupPhaseIndex("CREATE_READY_SNAPSHOTS")).toBe(3);
  });
  it("uses one recreation term in setup navigation and guidance", () => {
    expect(actionLabel("REPROVISION_VIRTUALS")).toBe("Recreate outdated clients");
    expect(setupExperience("REPROVISION_VIRTUALS").title).toBe(actionLabel("REPROVISION_VIRTUALS"));
    expect(setupExperience("REPROVISION_VIRTUALS").owner).toBe("CLIENTS");
  });

  it("labels completed setup without claiming gameplay readiness", () => {
    expect(actionLabel("READY")).toBe("Setup complete");
    expect(setupExperience("READY").title).toBe(actionLabel("READY"));
  });
  it("directs first boot through explicit setup startup and all-three verification", () => {
    const steps = setupExperience("VERIFY_IDENTITIES").steps.join(" ");
    expect(steps).toContain("Start first-time setup");
    expect(steps).toContain("all three clients running together");
    expect(steps).toContain("Check clients");
  });
});
