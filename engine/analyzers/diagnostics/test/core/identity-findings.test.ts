import { describe, expect, it } from "vitest";
import {
  packIdentityDriftDiagnostics,
  releaseIdentityConsistencyDiagnostics,
} from "../../src/core/identity-findings.js";

describe("identity findings", () => {
  it("reports persisted pack ownership that no longer has a current manifest identity", () => {
    const findings = packIdentityDriftDiagnostics(
      ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
      [
        {
          identity: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          namespace: "mivubi:score",
        },
      ],
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe("PACK_IDENTITY_DRIFT");
  });

  it("keeps release identity distinct from engine and API versions", () => {
    const findings = releaseIdentityConsistencyDiagnostics([
      { component: "world", releaseVersion: "1.0.4" },
      { component: "behavior-pack", releaseVersion: "1.0.3" },
    ]);

    expect(findings).toHaveLength(2);
    expect(findings.every((item) => item.code === "RELEASE_IDENTITY_INCONSISTENT")).toBe(true);
  });
});
