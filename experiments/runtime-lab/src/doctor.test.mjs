import test from "node:test";
import assert from "node:assert/strict";
import { formatDoctorReport } from "./doctor.mjs";

test("doctor formatter exposes proof readiness without hiding unknown probes", () => {
  const report = {
    platform: "windows",
    readyForProvisioning: true,
    blocking: [],
    checks: {
      provider: { selected: "vmware-workstation", status: "PASS" },
      cpu: { status: "PASS", logicalCpus: 16 },
      memory: { status: "PASS", totalGb: 32, freeGb: 20 },
      virtualization: { status: "UNKNOWN" },
      graphics: { status: "UNKNOWN" }
    }
  };

  const output = formatDoctorReport(report);
  assert.match(output, /vmware-workstation/);
  assert.match(output, /Virtualization\s+UNKNOWN/);
  assert.match(output, /Graphics\s+UNKNOWN/);
  assert.match(output, /READY FOR PROVISIONING/);
});
