import { describe, expect, it } from "vitest";
import {
  actionForClient,
  actionLabel,
  blockerLabel,
  hasStoppableClient,
  clientDisplayName,
  issueLabel,
  primaryClientAction,
  primaryClientBlocker,
  recoveryLabel,
  setupHint,
  stateLabel,
  updateLabel,
} from "../src/view-model.js";
import type { ClientLifecycleActions, ClientStatus } from "../src/contracts.js";

const allow = { allowed: true, blocker: null } as const;
const deny = { allowed: false, blocker: "INVALID_STATE" } as const;
const clientStatus = (state: ClientStatus["state"], minecraftRunning: boolean | null = null, interactiveLauncherReady: boolean | null = null): ClientStatus => ({
  id: "Virtual-01",
  native: false,
  state,
  readySnapshot: true,
  memoryLimitMb: 4096,
  hostWorkingSetMb: null,
  guestToolsReady: null,
  guestAgentReady: null,
  guestAgentVersion: null,
  minecraftVersion: null,
  minecraftRunning,
  interactiveLauncherReady,
  connectionHealth: null,
  lineageParity: null,
  versionParity: null,
  vmIdentity: null,
  windowsIdentity: null,
});

const actions: ClientLifecycleActions[] = [
  {
    id: "Virtual-01",
    start: deny,
    suspend: allow,
    stop: allow,
    open: allow,
    restart: allow,
    setReady: deny,
    reset: allow,
    reprovision: deny,
  },
];

describe("Virtual Clients presentation projection", () => {
  it("does not derive lifecycle rules locally", () => {
    expect(actionForClient(actions, "Virtual-01")).toBe(actions[0]);
    expect(actionForClient(actions, "Virtual-02")).toBeUndefined();
    expect(primaryClientAction(actions[0], clientStatus("RUNNING"))).toEqual({ kind: "open", label: "Open" });
    expect(primaryClientAction({
      ...actions[0],
      open: allow,
      start: allow,
    }, clientStatus("STOPPED"))).toEqual({ kind: "start", label: "Start" });
    expect(primaryClientAction({
      ...actions[0],
      open: allow,
      start: allow,
    }, clientStatus("SUSPENDED"))).toEqual({ kind: "start", label: "Resume" });
  });

  it("offers Finish setup when the interactive launcher is missing", () => {
    const client = { ...clientStatus("RUNNING", false), interactiveLauncherReady: false };
    expect(primaryClientAction(actions[0], client)).toEqual({ kind: "open", label: "Finish setup" });
  });

  it("offers Minecraft launch when the VM is running but Minecraft is closed", () => {
    expect(primaryClientAction(actions[0], clientStatus("RUNNING", false, true))).toEqual({ kind: "launch-minecraft", label: "Launch Minecraft" });
  });

  it("does not offer an impossible Minecraft launch when the interactive launcher is unavailable", () => {
    expect(primaryClientAction(actions[0], clientStatus("RUNNING", false, false))).toEqual({ kind: "open", label: "Open" });
  });

  it("presents internal states in user-facing language", () => {
    expect(stateLabel("NOT_PROVISIONED")).toBe("Not created");
    expect(clientDisplayName("Virtual-03")).toBe("Virtual 3");
    expect(recoveryLabel(true)).toBe("Recovery point saved");
    expect(blockerLabel("READY_SNAPSHOT_MISSING")).toBe("Save a recovery point first");
  });

  it("presents backend health without exposing internal terminology by default", () => {
    expect(
      issueLabel({
        code: "BASE_PROFILE_MISMATCH",
        severity: "BLOCKER",
        client: null,
      }),
    ).toMatch(/virtual environment.*needs rebuilding/i);
    expect(
      issueLabel({
        code: "READY_SNAPSHOT_MISSING",
        severity: "WARNING",
        client: "Virtual-01",
      }),
    ).toBe("Virtual 1 · Recovery point has not been saved yet");
  });

  it("uses backend setup action as the only setup decision", () => {
    expect(actionLabel("VERIFY_IDENTITIES")).toBe("Check virtual clients");
    expect(actionLabel("READY")).toBe("Setup complete");
    expect(setupHint("FINALIZE_BASE")).not.toMatch(/sysprep|provenance|base/i);
  });

  it("formats update states without inventing update policy", () => {
    expect(updateLabel("UP_TO_DATE")).toBe("Up to date");
    expect(updateLabel("UPDATE_AVAILABLE")).toBe("Update available");
    expect(updateLabel("UPDATE_STAGED")).toBe("Update ready to install");
  });
});

describe("Stop all availability", () => {

  it("allows stopping when only suspended clients remain", () => {
    expect(hasStoppableClient([clientStatus("SUSPENDED")], actions)).toBe(true);
  });

  it("does not enable stop for stopped clients or missing backend permission", () => {
    expect(hasStoppableClient([clientStatus("STOPPED")], actions)).toBe(false);
    expect(hasStoppableClient([clientStatus("RUNNING")], [{ ...actions[0], stop: deny }])).toBe(false);
    expect(hasStoppableClient([clientStatus("SUSPENDED")], [])).toBe(false);
  });
});

describe("Admission presentation", () => {
  it("does not label a stopped VM as ready for gameplay", () => {
    expect(stateLabel("STOPPED")).toBe("Stopped");
    expect(stateLabel("MANUAL")).toBe("Managed externally");
  });

  it("shows the backend reason without deriving a new admission policy", () => {
    const blocked = { ...deny, reason: "Host memory is insufficient." };
    const availability = { ...actions[0], start: blocked, open: allow };
    expect(primaryClientAction(availability, clientStatus("STOPPED"))).toBeUndefined();
    expect(primaryClientBlocker(availability, "STOPPED")).toBe("Host memory is insufficient.");
    expect(blockerLabel(blocked.blocker, blocked.reason)).toBe(blocked.reason);
  });
});

describe("First-time setup action", () => {
  it("uses backend setup availability before daily start", () => {
    const available = { ...actions[0], start: allow, startSetup: allow };
    expect(primaryClientAction(available, clientStatus("STOPPED"))).toEqual({ kind: "start-setup", label: "Start first-time setup" });
    expect(primaryClientAction(available, clientStatus("RUNNING"))).toEqual({ kind: "open", label: "Open" });
  });

  it("does not bypass blocked setup with daily Start", () => {
    const blocked = { ...deny, reason: "VM identity is unknown." };
    const available = { ...actions[0], start: allow, startSetup: blocked };
    expect(primaryClientAction(available, clientStatus("STOPPED"))).toBeUndefined();
    expect(primaryClientBlocker(available, "STOPPED")).toBe(blocked.reason);
  });
});
