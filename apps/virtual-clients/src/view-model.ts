import type {
  ClientLifecycleActions,
  ClientStatus,
  HealthIssue,
  SetupAction,
  UpdateState,
} from "./contracts.js";

export function actionLabel(action: SetupAction): string {
  const labels: Record<SetupAction, string> = {
    RUNTIME_DATA_INCOMPATIBLE: "Repair app data",
    INSTALL_PROVIDER: "Install virtualization",
    INSTALL_NATIVE_MINECRAFT: "Install Minecraft Education",
    PREPARE_BASE: "Prepare Minecraft environment",
    REGISTER_BASE: "Check Minecraft version",
    FINALIZE_BASE: "Finish environment setup",
    REBUILD_BASE: "Repair virtual environment",
    PROVISION_VIRTUALS: "Create virtual clients",
    REPROVISION_VIRTUALS: "Recreate outdated clients",
    VERIFY_IDENTITIES: "Check virtual clients",
    CREATE_READY_SNAPSHOTS: "Finish account setup",
    READY: "Setup complete",
  };
  return labels[action];
}

export function setupHint(action: SetupAction): string {
  const hints: Record<SetupAction, string> = {
    RUNTIME_DATA_INCOMPATIBLE: "The app data needs repair before Virtual Clients can continue safely.",
    INSTALL_PROVIDER: "Virtual Clients needs VMware on this computer before it can create virtual Minecraft clients.",
    INSTALL_NATIVE_MINECRAFT: "Install Minecraft Education on this computer first. It is used as the version reference.",
    PREPARE_BASE: "Prepare the reusable Minecraft environment used to create your virtual clients.",
    REGISTER_BASE: "Confirm that the prepared environment matches the Minecraft Education version on this computer.",
    FINALIZE_BASE: "Finish preparing the reusable environment. The app will continue after it has shut down safely.",
    REBUILD_BASE: "The prepared environment is incomplete or out of date and needs to be created again.",
    PROVISION_VIRTUALS: "Create Virtual 1, Virtual 2, and Virtual 3 from the prepared environment.",
    REPROVISION_VIRTUALS: "One or more virtual clients are out of date. Recreate only the affected client.",
    VERIFY_IDENTITIES: "Check that every virtual client has its own Windows and virtual-machine identity.",
    CREATE_READY_SNAPSHOTS: "Sign in to each virtual client once, then save its recovery point.",
    READY: "Setup is complete. You can start and manage virtual clients.",
  };
  return hints[action];
}

export function stateLabel(state: ClientStatus["state"]): string {
  const labels: Record<ClientStatus["state"], string> = {
    MANUAL: "Managed externally",
    NOT_PROVISIONED: "Not created",
    STOPPED: "Stopped",
    SUSPENDED: "Paused",
    RUNNING: "Running",
    ERROR: "Needs attention",
  };
  return labels[state];
}

export function clientDisplayName(id: ClientStatus["id"]): string {
  if (id === "Native") return "This PC";
  return `Virtual ${Number(id.slice(-2))}`;
}

export function recoveryLabel(value: boolean | null): string {
  if (value === true) return "Recovery point saved";
  if (value === false) return "Recovery point not saved";
  return "Recovery point unknown";
}

export function issueLabel(issue: HealthIssue): string {
  const labels: Record<string, string> = {
    RUNTIME_DATA_INCOMPATIBLE: "App data needs repair",
    PROVIDER_UNAVAILABLE: "Virtualization is not available",
    NATIVE_MINECRAFT_UNAVAILABLE: "Minecraft Education is not available on this PC",
    BASE_MISSING: "Virtual environment has not been prepared",
    BASE_RUNNING: "Virtual environment must be stopped before setup can continue",
    BASE_STATE_UNKNOWN: "Virtual environment setup status could not be confirmed",
    BASE_FINALIZATION_INTERRUPTED: "Virtual environment setup was interrupted",
    BASE_PROFILE_MISMATCH: "The virtual environment no longer matches this PC and needs rebuilding",
    VIRTUAL_NOT_PROVISIONED: "Virtual client has not been created yet",
    VIRTUAL_LINEAGE_MISMATCH: "Virtual client is using an outdated Minecraft environment",
    IDENTITY_PROOF_MISSING: "Virtual client identity has not been checked yet",
    READY_SNAPSHOT_MISSING: "Recovery point has not been saved yet",
    HOST_CAPACITY_LIMITED: "This PC may not comfortably run all virtual clients at once",
  };
  const prefix = issue.client ? `${clientDisplayName(issue.client as ClientStatus["id"])} · ` : "";
  return prefix + (labels[issue.code] ?? issue.code.replaceAll("_", " ").toLowerCase());
}

export function actionForClient(
  actions: readonly ClientLifecycleActions[],
  id: string,
): ClientLifecycleActions | undefined {
  return actions.find((item) => item.id === id);
}

export function blockerLabel(value: string | null | undefined, reason?: string): string {
  if (reason) return reason;
  if (!value) return "";
  const labels: Record<string, string> = {
    PROVIDER_UNAVAILABLE: "Virtualization is unavailable",
    NATIVE_MANAGED: "This PC is managed outside Virtual Clients",
    NOT_PROVISIONED: "This virtual client has not been created",
    INVALID_STATE: "This action is not available right now",
    READY_SNAPSHOT_MISSING: "Save a recovery point first",
    READY_SNAPSHOT_EXISTS: "A recovery point already exists",
  };
  return labels[value] ?? value.replaceAll("_", " ").toLowerCase();
}

export function primaryClientAction(
  actions: ClientLifecycleActions | undefined,
  state: ClientStatus["state"],
): { kind: "open" | "start" | "start-setup"; label: string } | undefined {
  if (!actions) return undefined;

  if (state === "RUNNING" && actions.open.allowed) {
    return { kind: "open", label: "Open" };
  }
  if ((state === "STOPPED" || state === "SUSPENDED") && actions.startSetup) {
    return actions.startSetup.allowed ? { kind: "start-setup", label: "Start first-time setup" } : undefined;
  }
  if (state === "SUSPENDED" && actions.start.allowed) {
    return { kind: "start", label: "Resume" };
  }
  if (state === "STOPPED" && actions.start.allowed) {
    return { kind: "start", label: "Start" };
  }

  return undefined;
}

export function updateLabel(state: UpdateState): string {
  const labels: Record<UpdateState, string> = {
    UP_TO_DATE: "Up to date",
    UPDATE_AVAILABLE: "Update available",
    UPDATE_STAGED: "Update ready to install",
    UNAVAILABLE: "Update check unavailable",
  };
  return labels[state];
}

/** A suspended client is still eligible for Stop; use backend action authority. */
export function hasStoppableClient(
  clients: readonly ClientStatus[],
  actions: readonly ClientLifecycleActions[],
): boolean {
  return clients.some(
    (client) =>
      !client.native &&
      client.state !== "STOPPED" &&
      actionForClient(actions, client.id)?.stop.allowed === true,
  );
}

export function primaryClientBlocker(
  actions: ClientLifecycleActions | undefined,
  state: ClientStatus["state"],
): string {
  if (!actions) return "Action availability could not be verified.";
  const action = state === "RUNNING" ? actions.open : (actions.startSetup ?? actions.start);
  return blockerLabel(action.blocker, action.reason);
}
