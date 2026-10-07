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
export type ConnectionHealth = "VM_OFFLINE" | "VM_RUNNING" | "GUEST_TOOLS_READY" | "GUEST_AGENT_READY" | "INTERACTIVE_LAUNCHER_READY" | "MINECRAFT_RUNNING";
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
  reason?: string;
}

export interface ClientLifecycleActions {
  id: Exclude<ClientId, "Native">;
  start: ActionAvailability;
  startSetup?: ActionAvailability;
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
  minecraftRunning: boolean | null;
  interactiveLauncherReady: boolean | null;
  connectionHealth: ConnectionHealth | null;
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
    totalMemoryMb: number;
    availableMemoryMb: number;
    availablePercent: number;
    cpuUsagePercent: number;
    level: "NORMAL" | "PRESSURE" | "CRITICAL";
    canStartVirtual: boolean;
    startDecision: "START_NOW" | "WAIT" | "BLOCK";
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
  nextSetupAction: SetupAction;
  issues: HealthIssue[];
}

export interface DiagnosticsReport {
  appVersion: string;
  runtime: RuntimeStatus;
  host: {
    os: string | null;
    osVersion: string | null;
    cpu: string | null;
    logicalCpus: number;
    totalMemoryMb: number;
    availableMemoryMb: number;
    graphics: string[];
    hypervisorPresent: boolean | null;
    vbsStatus: number | null;
  };
  provider: {
    id: string | null;
    version: string | null;
  };
  virtualHardware: Array<{
    id: Exclude<ClientId, "Native">;
    networkMode: string | null;
    graphics3dEnabled: boolean | null;
  }>;
}

export interface EngineSnapshot {
  capturedAtUnixMs: number;
  doctor: DoctorReport;
  diagnostics: DiagnosticsReport;
}

export interface BasePreparationReport {
  platform: string;
  provider: string | null;
  providerVersion: string | null;
  nativeVersion: string | null;
  nativeInstallType: string | null;
  baseExpectedPath: string | null;
  basePresent: boolean;
  baseStopped: boolean | null;
  baseState: BaseState | null;
  configuredMemoryMb: number | null;
  configuredVcpus: number | null;
  graphics3dEnabled: boolean | null;
  networkPresent: boolean | null;
  networkStartConnected: boolean | null;
  networkConnectionType: string | null;
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

export interface OperationProgress {
  schema: 2;
  operation: string;
  phase: "EXECUTING" | "SUCCEEDED" | "FAILED";
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

export type WindowLayout = "GRID" | "FOCUS" | "COLUMNS";

export interface WindowLayoutRequest {
  layout: WindowLayout;
  displayIndex: number;
  mainWindow: ClientId | null;
}

export interface DisplayInfo {
  index: number;
  primary: boolean;
  width: number;
  height: number;
}

export type OverlayPosition = "TOP_LEFT" | "TOP_RIGHT";

export interface ScreenOverlayPreference {
  enabled: boolean;
  showScreenNumber: boolean;
  showLabel: boolean;
  position: OverlayPosition;
  opacity: number;
  labels: Record<ClientId, string>;
}

export interface WindowArrangementResult {
  schema: 2;
  layout: WindowLayout;
  displayIndex: number;
  arranged: ClientId[];
  missing: ClientId[];
  overlayApplied?: boolean;
  overlayWarning?: string | null;
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

export type PayloadValidator<T> = (value: unknown) => value is T;

export function parseSuccessEnvelope<T>(raw: string, validate: PayloadValidator<T>): T {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || parsed.schema !== PUBLIC_CONTRACT_SCHEMA || !("data" in parsed)) {
    throw new Error(`Backend response does not match public contract schema ${PUBLIC_CONTRACT_SCHEMA}.`);
  }
  if (!validate(parsed.data)) {
    throw new Error("Backend response data does not match the requested command contract.");
  }
  return parsed.data;
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
