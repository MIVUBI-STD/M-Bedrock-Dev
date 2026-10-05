import test from "node:test";
import assert from "node:assert/strict";
import { formatDoctorReport } from "./doctor.mjs";

test("doctor formatter reports provider and keeps graphics proof explicit", () => {
  const report = {
    platform: "windows",
    provider: "vmware-workstation",
    readyForProvisioning: true,
    blocking: [],
    checks: {
      cpu: { status: "PASS", logicalCpus: 16 },
      memory: { status: "PASS", totalGb: 32, freeGb: 20 },
      virtualization: { status: "PASS" },
      graphics: { status: "UNKNOWN" }
    }
  };

  const output = formatDoctorReport(report);
  assert.match(output, /vmware-workstation/);
  assert.match(output, /Virtualization\s+PASS/);
  assert.match(output, /Graphics\s+UNKNOWN/);
  assert.match(output, /READY FOR PROVISIONING/);
});
