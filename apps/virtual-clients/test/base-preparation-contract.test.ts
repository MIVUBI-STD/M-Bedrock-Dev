import { describe, expect, it } from "vitest";
import { basePreparation } from "../src/app/bridge/payloadValidation.js";
import { parseSuccessEnvelope, type BasePreparationReport } from "../src/contracts.js";

describe("Base preparation public contract", () => {
  it("accepts read-only Base preflight facts without setup authority", () => {
    const report = parseSuccessEnvelope<BasePreparationReport>(JSON.stringify({
      schema: 1,
      data: {
        platform: "windows",
        provider: "vmware-workstation",
        providerVersion: "17.6",
        nativeVersion: "1.21.120.0",
        nativeInstallType: "DESKTOP",
        baseExpectedPath: "C:/Base/Base.vmx",
        basePresent: true,
        baseStopped: true,
        baseState: null,
        configuredMemoryMb: 4096,
        configuredVcpus: 2,
        graphics3dEnabled: true,
        networkPresent: true,
        networkStartConnected: true
      }
    }), basePreparation);
    expect(report.basePresent).toBe(true);
    expect((report as unknown as Record<string, unknown>).nextSetupAction).toBeUndefined();
  });
});
