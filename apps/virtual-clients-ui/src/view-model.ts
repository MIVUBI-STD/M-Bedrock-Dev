import type {
  ClientLifecycleActions,
  ClientStatus,
  HealthIssue,
  SetupAction,
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
