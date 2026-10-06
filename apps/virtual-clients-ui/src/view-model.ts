import type {
  ClientLifecycleActions,
  ClientStatus,
  HealthIssue,
  SetupAction,
  UpdateState,
} from "./contracts.js";

export function actionLabel(action: SetupAction): string {
  const labels: Record<SetupAction, string> = {
    RUNTIME_DATA_INCOMPATIBLE: "Repair runtime data",
    INSTALL_PROVIDER: "Install VMware",
    INSTALL_NATIVE_MINECRAFT: "Install Minecraft Education",
    PREPARE_BASE: "Prepare Base",
    REGISTER_BASE: "Register Base",
    FINALIZE_BASE: "Finalize Base",
    REBUILD_BASE: "Rebuild Base",
    PROVISION_VIRTUALS: "Provision Virtuals",
    REPROVISION_VIRTUALS: "Reprovision Virtuals",
    VERIFY_IDENTITIES: "Verify identities",
    CREATE_READY_SNAPSHOTS: "Create QA_READY",
    READY: "Ready",
  };
  return labels[action];
}

export function stateLabel(state: ClientStatus["state"]): string {
  return state.replaceAll("_", " ").toLowerCase().replace(/^./, (value) => value.toUpperCase());
}

export function issueLabel(issue: HealthIssue): string {
  const client = issue.client ? `${issue.client} · ` : "";
  return client + issue.code.replaceAll("_", " ").toLowerCase();
}

export function actionForClient(
  actions: readonly ClientLifecycleActions[],
  id: string,
): ClientLifecycleActions | undefined {
  return actions.find((item) => item.id === id);
}

export function blockerLabel(value: string | null | undefined): string {
  if (!value) return "";
  return value.replaceAll("_", " ").toLowerCase();
}


export function setupHint(action: SetupAction): string {
  const hints: Record<SetupAction, string> = {
    RUNTIME_DATA_INCOMPATIBLE: "Runtime metadata is incompatible with this app version.",
    INSTALL_PROVIDER: "Install a supported VMware provider before provisioning Virtual clients.",
    INSTALL_NATIVE_MINECRAFT: "Install Minecraft Education on the physical host first.",
    PREPARE_BASE: "Prepare the Base guest with the backend preparation script.",
    REGISTER_BASE: "Verify the stopped Base against Native and register its provenance.",
    FINALIZE_BASE: "Run the persisted Base finalization script inside the Base, then let Sysprep shut it down.",
    REBUILD_BASE: "Discard the ambiguous Base and prepare a fresh Base before continuing.",
    PROVISION_VIRTUALS: "Create Virtual-01 through Virtual-03 from the finalized Base.",
    REPROVISION_VIRTUALS: "Use the affected Virtual card to reprovision only the stale client.",
    VERIFY_IDENTITIES: "Start all three Virtual clients, then verify VM and Windows identities.",
    CREATE_READY_SNAPSHOTS: "Finish per-Virtual account setup, stop each Virtual, then create QA_READY from its card.",
    READY: "Backend setup gates are satisfied.",
  };
  return hints[action];
}

export function updateLabel(state: UpdateState): string {
  const labels: Record<UpdateState, string> = {
    UP_TO_DATE: "Up to date",
    UPDATE_AVAILABLE: "Update available",
    UPDATE_STAGED: "Update staged",
    UNAVAILABLE: "Update unavailable",
  };
  return labels[state];
}
