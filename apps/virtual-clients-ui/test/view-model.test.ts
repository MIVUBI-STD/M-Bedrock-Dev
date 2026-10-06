import { describe, expect, it } from "vitest";
import {
  actionForClient,
  actionLabel,
  blockerLabel,
  issueLabel,
  setupHint,
  stateLabel,
  updateLabel,
} from "../src/view-model.js";
import type { ClientLifecycleActions } from "../src/contracts.js";

const allow = { allowed: true, blocker: null } as const;
const actions: ClientLifecycleActions[] = [
  {
    id: "Virtual-01",
    start: allow,
    suspend: allow,
    stop: allow,
    open: allow,
    restart: allow,
    setReady: allow,
    reset: allow,
    reprovision: allow,
  },
];

describe("Virtual Clients presentation projection", () => {
  it("does not derive lifecycle rules locally", () => {
    expect(actionForClient(actions, "Virtual-01")).toBe(actions[0]);
    expect(actionForClient(actions, "Virtual-02")).toBeUndefined();
  });

  it("formats backend enums for presentation only", () => {
    expect(stateLabel("NOT_PROVISIONED")).toBe("Not provisioned");
    expect(blockerLabel("READY_SNAPSHOT_MISSING")).toBe("ready snapshot missing");
    expect(
      issueLabel({
        code: "IDENTITY_PROOF_MISSING",
        severity: "WARNING",
        client: "Virtual-01",
      }),
    ).toBe("Virtual-01 · identity proof missing");
  });

  it("uses backend setup action as the only setup decision", () => {
    expect(actionLabel("VERIFY_IDENTITIES")).toBe("Verify identities");
    expect(actionLabel("READY")).toBe("Ready");
    expect(setupHint("FINALIZE_BASE")).toMatch(/finalization script/i);
  });

  it("formats update states without inventing update policy", () => {
    expect(updateLabel("UP_TO_DATE")).toBe("Up to date");
    expect(updateLabel("UPDATE_AVAILABLE")).toBe("Update available");
    expect(updateLabel("UPDATE_STAGED")).toBe("Update staged");
  });
});
