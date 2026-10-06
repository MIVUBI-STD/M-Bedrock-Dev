import { describe, expect, it } from "vitest";
import {
  actionForClient,
  actionLabel,
  blockerLabel,
  hasStoppableClient,
  clientDisplayName,
  issueLabel,
  primaryClientAction,
  recoveryLabel,
  setupHint,
  stateLabel,
  updateLabel,
} from "../src/view-model.js";
import type { ClientLifecycleActions, ClientStatus } from "../src/contracts.js";

const allow = { allowed: true, blocker: null } as const;
const deny = { allowed: false, blocker: "INVALID_STATE" } as const;
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
    expect(primaryClientAction(actions[0], "RUNNING")).toEqual({ kind: "open", label: "Open" });
    expect(primaryClientAction({
      ...actions[0],
      open: allow,
      start: allow,
    }, "STOPPED")).toEqual({ kind: "start", label: "Start" });
    expect(primaryClientAction({
      ...actions[0],
      open: allow,
      start: allow,
    }, "SUSPENDED")).toEqual({ kind: "start", label: "Resume" });
  });

  it("presents internal states in user-facing language", () => {
    expect(stateLabel("NOT_PROVISIONED")).toBe("Not created");
    expect(clientDisplayName("Virtual-03")).toBe("Virtual 3");
    expect(recoveryLabel(true)).toBe("Recovery point ready");
    expect(blockerLabel("READY_SNAPSHOT_MISSING")).toBe("Save a recovery point first");
  });

  it("presents backend health without exposing internal terminology by default", () => {
    expect(
      issueLabel({
        code: "BASE_PROFILE_MISMATCH",
        severity: "BLOCKER",
        client: null,
      }),
    ).toMatch(/Minecraft Education was updated/i);
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
    expect(actionLabel("READY")).toBe("Ready to use");
    expect(setupHint("FINALIZE_BASE")).not.toMatch(/sysprep|provenance|base/i);
  });

  it("formats update states without inventing update policy", () => {
    expect(updateLabel("UP_TO_DATE")).toBe("Up to date");
    expect(updateLabel("UPDATE_AVAILABLE")).toBe("Update available");
    expect(updateLabel("UPDATE_STAGED")).toBe("Update ready to install");
  });
});

describe("Stop all availability", () => {
  const client = (state: ClientStatus["state"]): ClientStatus => ({
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
    lineageParity: null,
    versionParity: null,
    vmIdentity: null,
    windowsIdentity: null,
  });

  it("allows stopping when only suspended clients remain", () => {
    expect(hasStoppableClient([client("SUSPENDED")], actions)).toBe(true);
  });

  it("does not enable stop for stopped clients or missing backend permission", () => {
    expect(hasStoppableClient([client("STOPPED")], actions)).toBe(false);
    expect(hasStoppableClient([client("RUNNING")], [{ ...actions[0], stop: deny }])).toBe(false);
    expect(hasStoppableClient([client("SUSPENDED")], [])).toBe(false);
  });
});
