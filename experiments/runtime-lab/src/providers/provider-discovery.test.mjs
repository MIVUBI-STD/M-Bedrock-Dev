import test from "node:test";
import assert from "node:assert/strict";
import { selectPreferredProvider } from "./provider-discovery.mjs";

test("Windows preference selects Workstation before fallback providers", () => {
  if (process.platform === "darwin") return;

  const selected = selectPreferredProvider([
    { id: "virtualbox", available: true },
    { id: "vmware-workstation", available: true }
  ]);

  assert.equal(selected?.id, "vmware-workstation");
});

test("returns null when no provider is available", () => {
  assert.equal(selectPreferredProvider([]), null);
});
