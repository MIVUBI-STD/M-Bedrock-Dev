import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  actionAvailability, baseProfile, clientStatus, enginePolicy, engineSnapshot,
  displayList, lifecycleActions, operationHistory, updateCheck, windowArrangement,
} from "../src/app/bridge/payloadValidation.js";

const allowed = { allowed: true, blocker: null };
const actionsFor = (id: string) => ({
  id, start: allowed, suspend: allowed, stop: allowed, open: allowed,
  restart: allowed, setReady: allowed, reset: allowed, reprovision: allowed,
});
const clientFor = (id: string) => ({
  id, native: id === "Native", state: id === "Native" ? "MANUAL" : "STOPPED",
  readySnapshot: null, memoryLimitMb: null, hostWorkingSetMb: null,
  guestToolsReady: null, guestAgentReady: null, guestAgentVersion: null,
  minecraftVersion: null, minecraftRunning: null, interactiveLauncherReady: null, lineageParity: null, versionParity: null,
  vmIdentity: null, windowsIdentity: null,
});
const snapshot = () => ({
  capturedAtUnixMs: 1,
  doctor: {
    platform: "windows", provider: null, logicalCpus: 8,
    totalMemoryGb: 32, availableMemoryGb: 16, maxRecommendedVirtualClients: 3,
    baseVmPresent: false, baseVmStopped: null, baseState: null,
    readyForProvisioning: false, nextSetupAction: "INSTALL_PROVIDER", issues: [],
  },
  diagnostics: {
    appVersion: "0.1.0",
    runtime: {
      provider: null,
      runtimeProfile: { native: null, base: null, parity: "UNKNOWN" },
      pressure: { level: "NORMAL", canStartVirtual: true },
      clients: ["Native", "Virtual-01", "Virtual-02", "Virtual-03"].map(clientFor),
    },
    host: { os: "Windows", osVersion: null, logicalCpus: 8, totalMemoryMb: 32768, availableMemoryMb: 16384 },
    provider: { id: null, version: null },
  },
});

describe("Backend payload shapes", () => {
  it("accepts the consumed snapshot fields and additive backend fields", () => {
    expect(engineSnapshot({ ...snapshot(), extraBackendField: true })).toBe(true);
  });

  it("rejects missing nested fields and unknown setup actions", () => {
    const missing = snapshot();
    delete (missing.diagnostics as { runtime?: unknown }).runtime;
    expect(engineSnapshot(missing)).toBe(false);
    const unknown = snapshot();
    unknown.doctor.nextSetupAction = "GUESS_SETUP";
    expect(engineSnapshot(unknown)).toBe(false);
  });

  it("rejects non-finite telemetry and unknown pressure", () => {
    const invalid = snapshot();
    invalid.diagnostics.host.availableMemoryMb = Infinity;
    expect(engineSnapshot(invalid)).toBe(false);
    invalid.diagnostics.host.availableMemoryMb = 16;
    invalid.diagnostics.runtime.pressure.level = "MAYBE";
    expect(engineSnapshot(invalid)).toBe(false);
  });

  it("rejects unknown client states and mismatched Native identity", () => {
    expect(clientStatus({ ...clientFor("Virtual-01"), state: "READY" })).toBe(false);
    expect(clientStatus({ ...clientFor("Native"), native: false })).toBe(false);
  });

  it("rejects missing or duplicate clients in a complete snapshot", () => {
    const invalid = snapshot();
    invalid.diagnostics.runtime.clients[3] = clientFor("Virtual-02");
    expect(engineSnapshot(invalid)).toBe(false);
    invalid.diagnostics.runtime.clients.pop();
    expect(engineSnapshot(invalid)).toBe(false);
  });

  it("requires one action entry for every Virtual", () => {
    const all = ["Virtual-01", "Virtual-02", "Virtual-03"].map(actionsFor);
    expect(lifecycleActions(all)).toBe(true);
    expect(lifecycleActions(all.slice(1))).toBe(false);
    expect(lifecycleActions([all[0], all[0], all[2]])).toBe(false);
  });

  it("validates optional setup action availability without requiring it from older responses", () => {
    const all = ["Virtual-01", "Virtual-02", "Virtual-03"].map(actionsFor);
    expect(lifecycleActions(all)).toBe(true);
    expect(lifecycleActions(all.map((item) => ({ ...item, startSetup: allowed })))).toBe(true);
    expect(lifecycleActions(all.map((item) => ({ ...item, startSetup: { allowed: "yes" } })))).toBe(false);
  });

  it("checks the allowed/blocker invariant and optional explanation", () => {
    expect(actionAvailability(allowed)).toBe(true);
    expect(actionAvailability({ allowed: false, blocker: "INVALID_STATE", reason: "Memory pressure" })).toBe(true);
    expect(actionAvailability({ allowed: true, blocker: "INVALID_STATE" })).toBe(false);
    expect(actionAvailability({ allowed: false, blocker: null })).toBe(false);
    expect(actionAvailability({ ...allowed, reason: 7 })).toBe(false);
  });

  it("rejects invalid numeric policy fields", () => {
    const policy = {
      maxVirtualClients: 3, virtualMemoryLimitMb: 4096, virtualVcpus: 2,
      guestAgentPort: 47831, readySnapshotName: "QA_READY",
      nativeIsVersionAuthority: true, runtimeSelfUpdateEnabled: false,
    };
    expect(enginePolicy(policy)).toBe(true);
    expect(enginePolicy({ ...policy, virtualVcpus: "two" })).toBe(false);
    expect(enginePolicy({ ...policy, maxVirtualClients: -1 })).toBe(false);
  });

  it("requires Base generation and Guest Agent protocol provenance", () => {
    const value = {
      schema: 3,
      minecraftVersion: "1.21.120.0",
      nativeInstallType: "DESKTOP",
      guestStatusSchema: 3,
      guestAgentProtocol: 1,
      guestAgentVersion: "0.1.0",
      baseGenerationId: "a".repeat(64),
      source: "LIVE_VERIFIED",
    };
    expect(baseProfile(value)).toBe(true);
    expect(baseProfile({ ...value, schema: 2 })).toBe(false);
    expect(baseProfile({ ...value, baseGenerationId: undefined })).toBe(false);
    expect(baseProfile({ ...value, baseGenerationId: "short" })).toBe(false);
    expect(baseProfile({ ...value, guestAgentProtocol: undefined })).toBe(false);
    expect(baseProfile({ ...value, guestAgentProtocol: 0 })).toBe(false);
  });

  it("rejects malformed journal records", () => {
    expect(operationHistory([])).toBe(true);
    expect(operationHistory([{ schema: 1, outcome: "SUCCESS" }])).toBe(false);
  });

  it("rejects unknown update and desktop layout states", () => {
    expect(updateCheck({ state: "READY" })).toBe(false);
    expect(displayList([{ index: 0, primary: true, width: 1920, height: 1080 }])).toBe(true);
    expect(displayList([{ index: 0, primary: true, width: 0, height: 1080 }])).toBe(false);
    expect(windowArrangement({ schema: 2, layout: "GRID", displayIndex: 0, arranged: ["Native"], missing: [], overlayApplied: true, overlayWarning: null })).toBe(true);
    expect(windowArrangement({ schema: 2, layout: "SURPRISE", displayIndex: 0, arranged: [], missing: [] })).toBe(false);
  });
});

describe("Frontend boundary wiring", () => {
  it("requires validators for command responses", () => {
    const source = readFileSync(new URL("../src/app/bridge/virtualClientsApi.ts", import.meta.url), "utf8");
    expect(source).toContain("parseSuccessEnvelope<T>(raw, validate)");
    const commands = source.match(/invokePublic<[^>]+>\("virtual_clients_[^"]+", payload\.[A-Za-z]+/g) ?? [];
    expect(commands.length).toBe(23);
  });

  it("registers every frontend command in Tauri and the core dispatcher", () => {
    const facade = readFileSync(new URL("../src/app/bridge/virtualClientsApi.ts", import.meta.url), "utf8");
    const adapters = readFileSync(new URL("../src-tauri/src/commands/virtual_clients.rs", import.meta.url), "utf8");
    const bootstrap = readFileSync(new URL("../src-tauri/src/app_bootstrap.rs", import.meta.url), "utf8");
    const core = readFileSync(new URL("../../../virtual-clients/runtime-core/src/command.rs", import.meta.url), "utf8");
    const commands = [...facade.matchAll(/invokePublic<[^>]+>\("([^"]+)"/g)].map((match) => match[1]);
    expect(commands).toHaveLength(23);
    for (const command of commands) {
      expect(adapters).toContain(`fn ${command}(`);
      expect(bootstrap).toContain(`commands::virtual_clients::${command},`);
    }
    for (const match of adapters.matchAll(/run\("([^"]+)"/g)) {
      expect(core).toContain(`"${match[1]}" =>`);
    }
  });

  it("keeps Window Layout on one registered desktop mutation path", () => {
    const facade = readFileSync(new URL("../src/app/bridge/virtualClientsApi.ts", import.meta.url), "utf8");
    const commands = readFileSync(new URL("../src-tauri/src/commands/window_arrangement.rs", import.meta.url), "utf8");
    const bootstrap = readFileSync(new URL("../src-tauri/src/app_bootstrap.rs", import.meta.url), "utf8");
    expect(facade).toContain('"window_displays"');
    expect(facade).toContain('"window_apply_layout"');
    expect(facade).not.toContain('"window_arrange"');
    expect(facade).not.toContain('"window_clear_overlay"');
    expect(commands).toContain("fn window_displays(");
    expect(commands).toContain("fn window_apply_layout(");
    expect(commands).not.toContain("fn window_arrange(");
    expect(commands).not.toContain("fn window_clear_overlay(");
    expect(bootstrap).toContain("commands::window_arrangement::window_displays,");
    expect(bootstrap).toContain("commands::window_arrangement::window_apply_layout");
  });

  it("refreshes on return without introducing a diagnostic polling loop", () => {
    const source = readFileSync(new URL("../src/App.svelte", import.meta.url), "utf8");
    expect(source).toContain('window.addEventListener("focus", refreshVisibleClients)');
    expect(source).toContain('window.removeEventListener("focus", refreshVisibleClients)');
    expect(source).toContain("if (busy || refreshRunning) return;");
    expect(source).not.toContain("setInterval");
  });
});
