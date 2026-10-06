import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const root = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));
const app = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const router = readFileSync(new URL("../../../tooling/windows-toolchain/dev.ps1", import.meta.url), "utf8");

describe("Complete Virtual Clients source checkpoint", () => {
  it("includes frontend, app and canonical backend checks through one aggregate", () => {
    const steps = root.scripts["virtual-clients:verify"].split(" && ");
    expect(steps).toEqual([
      "npm run virtual-clients:test",
      "npm --prefix apps/virtual-clients run verify:source",
      "cargo check --locked --all-targets --manifest-path experiments/virtual-clients/backend/Cargo.toml",
      "cargo test --locked --all-targets --manifest-path experiments/virtual-clients/backend/Cargo.toml",
      "cargo fmt --manifest-path experiments/virtual-clients/backend/Cargo.toml --all --check",
    ]);
  });

  it("preserves build and icon preparation before Tauri checks", () => {
    expect(app.scripts["verify:source"]).toBe(
      "npm run typecheck && npm run build:frontend && npm run check:rust && npm run test:rust",
    );
    expect(app.scripts["check:rust"]).toContain("npm run prepare:icons && cargo check");
    expect(app.scripts["test:rust"]).toContain("cargo test --all-targets");
    expect(app.scripts["check:rust"]).not.toContain("--locked");
  });

  it("routes the public command through DEV without packaging or starting guests", () => {
    expect(router).toContain('"verify-virtual-clients"');
    expect(router).toContain("npm run virtual-clients:verify");
    expect(router).toContain('Write-Host "  DEV.cmd verify-virtual-clients"');
    expect(root.scripts["virtual-clients:verify"]).not.toMatch(/build:app|dev:app|workflow|vmrun/);
  });
});
