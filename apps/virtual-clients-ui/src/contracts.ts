export const PUBLIC_CONTRACT_SCHEMA = 1 as const;

export type ClientId = "Native" | "Virtual-01" | "Virtual-02" | "Virtual-03";
export type ClientState =
  | "MANUAL"
  | "NOT_PROVISIONED"
  | "STOPPED"
  | "SUSPENDED"
  | "RUNNING"
  | "ERROR";
export type ProfileParity = "MATCH" | "MISMATCH" | "UNKNOWN";
export type IdentityState = "UNKNOWN" | "UNIQUE" | "DUPLICATE";
export type BaseState = "REGISTERED" | "FINALIZING" | "FINALIZED";
export type HealthSeverity = "BLOCKER" | "WARNING";

export type SetupAction =
  | "RUNTIME_DATA_INCOMPATIBLE"
  | "INSTALL_PROVIDER"
  | "INSTALL_NATIVE_MINECRAFT"
  | "PREPARE_BASE"
  | "REGISTER_BASE"
  | "FINALIZE_BASE"
  | "REBUILD_BASE"
  | "PROVISION_VIRTUALS"
  | "REPROVISION_VIRTUALS"
  | "VERIFY_IDENTITIES"
  | "CREATE_READY_SNAPSHOTS"
  | "READY";

export type LifecycleBlocker =
  | "PROVIDER_UNAVAILABLE"
  | "NATIVE_MANAGED"
  | "NOT_PROVISIONED"
  | "INVALID_STATE"
  | "READY_SNAPSHOT_MISSING"
  | "READY_SNAPSHOT_EXISTS";

export interface ActionAvailability {
  allowed: boolean;
  blocker: LifecycleBlocker | null;
}

export interface ClientLifecycleActions {
  id: Exclude<ClientId, "Native">;
  start: ActionAvailability;
  suspend: ActionAvailability;
  stop: ActionAvailability;
  open: ActionAvailability;
  restart: ActionAvailability;
  setReady: ActionAvailability;
  reset: ActionAvailability;
  reprovision: ActionAvailability;
}

export interface ClientStatus {
  id: ClientId;
  native: boolean;
  state: ClientState;
  readySnapshot: boolean | null;
  memoryLimitMb: number | null;
  hostWorkingSetMb: number | null;
  guestToolsReady: boolean | null;
  guestAgentReady: boolean | null;
  guestAgentVersion: string | null;
  minecraftVersion: string | null;
  lineageParity: ProfileParity | null;
  versionParity: ProfileParity | null;
  vmIdentity: IdentityState | null;
  windowsIdentity: IdentityState | null;
}

export interface RuntimeStatus {
  provider: string | null;
  runtimeProfile: {
    native: { version: string } | null;
    base: { minecraftVersion: string } | null;
    parity: ProfileParity;
  };
  pressure: {
    level: string;
    canStartVirtual: boolean;
  };
  clients: ClientStatus[];
}

export interface HealthIssue {
  code: string;
  severity: HealthSeverity;
  client: string | null;
}

export interface DoctorReport {
  platform: string;
  provider: string | null;
  logicalCpus: number;
  totalMemoryGb: number;
  availableMemoryGb: number;
  maxRecommendedVirtualClients: number;
  baseVmPresent: boolean;
  baseVmStopped: boolean | null;
  baseState: BaseState | null;
  readyForProvisioning: boolean;
  nextSetupAction: SetupAction;
  issues: HealthIssue[];
}

export interface DiagnosticsReport {
  appVersion: string;
  runtime: RuntimeStatus;
  host: {
    os: string | null;
    osVersion: string | null;
    logicalCpus: number;
    totalMemoryMb: number;
    availableMemoryMb: number;
  };
  provider: {
    id: string | null;
    version: string | null;
  };
}

export interface EngineSnapshot {
  capturedAtUnixMs: number;
  doctor: DoctorReport;
  diagnostics: DiagnosticsReport;
}

export interface EnginePolicy {
  maxVirtualClients: number;
  virtualMemoryLimitMb: number;
  virtualVcpus: number;
  guestAgentPort: number;
  readySnapshotName: string;
  nativeIsVersionAuthority: boolean;
  runtimeSelfUpdateEnabled: boolean;
}

export interface OperationRecord {
  schema: number;
  timestampUnixMs: number;
  operation: string;
  target: string | null;
  outcome: "SUCCESS" | "FAILED";
  errorCode: string | null;
  retryable: boolean;
}

export type UpdateState =
  | "UP_TO_DATE"
  | "UPDATE_AVAILABLE"
  | "UPDATE_STAGED"
  | "UNAVAILABLE";

export interface UpdateCheck {
  state: UpdateState;
  currentVersion: string;
  latestVersion: string | null;
  canApplyNow: boolean;
  selfUpdateEnabled: boolean;
  stagedPath: string | null;
  reason: string | null;
}

export interface SupportBundleResult {
  capturedAtUnixMs: number;
  path: string;
}

export interface SuccessEnvelope<T> {
  schema: 1;
  data: T;
}

export interface ErrorEnvelope {
  schema: 1;
  code: string;
  message: string;
  retryable: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSuccessEnvelope<T>(raw: string): T {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || parsed.schema !== PUBLIC_CONTRACT_SCHEMA || !("data" in parsed)) {
    throw new Error("Backend response does not match public contract schema 1.");
  }
  return parsed.data as T;
}

export function parseErrorEnvelope(raw: string): ErrorEnvelope | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.schema !== PUBLIC_CONTRACT_SCHEMA ||
      typeof parsed.code !== "string" ||
      typeof parsed.message !== "string" ||
      typeof parsed.retryable !== "boolean"
    ) {
      return undefined;
    }
    return parsed as unknown as ErrorEnvelope;
  } catch {
    return undefined;
  }
}
