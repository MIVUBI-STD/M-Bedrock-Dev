import type {
  ActionAvailability, BasePreparationReport, ClientLifecycleActions,
  ClientStatus, EnginePolicy, EngineSnapshot, OperationRecord, PayloadValidator,
  DisplayInfo, SupportBundleResult, UpdateCheck, WindowArrangementResult,
} from "../../contracts.js";

type Check = (value: unknown) => boolean;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text: Check = (value) => typeof value === "string";
const boolean: Check = (value) => typeof value === "boolean";
const number: Check = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const integer: Check = (value) => typeof value === "number" && value >= 0 && Number.isSafeInteger(value);
const positiveInteger: Check = (value) => integer(value) && value > 0;
const hex64: Check = (value) => typeof value === "string" && /^[0-9a-fA-F]{64}$/.test(value);
const nullable = (check: Check): Check => (value) => value === null || check(value);
const optional = (check: Check): Check => (value) => value === undefined || check(value);
const oneOf = (...values: readonly unknown[]): Check => (value) => values.includes(value);
const array = (check: Check): Check => (value) => Array.isArray(value) && value.every(check);

// Validate every field consumed by this frontend. Extra backend fields remain
// compatible; no policy decisions or alternate runtime state are derived here.
function shape<T>(fields: Record<string, Check>): PayloadValidator<T> {
  return (value: unknown): value is T =>
    record(value) && Object.entries(fields).every(([key, check]) => check(value[key]));
}

const clientIds = ["Native", "Virtual-01", "Virtual-02", "Virtual-03"] as const;
const virtualIds = clientIds.slice(1);
const clientId = oneOf(...clientIds);
const virtualId = oneOf(...virtualIds);
const parity = oneOf("MATCH", "MISMATCH", "UNKNOWN");
const identity = oneOf("UNKNOWN", "UNIQUE", "DUPLICATE");
const baseState = oneOf("REGISTERED", "FINALIZING", "FINALIZED");
const errorCode = oneOf(
  "INVALID_INPUT", "NOT_FOUND", "PERMISSION_DENIED", "INVALID_DATA",
  "OPERATION_BUSY", "TIMEOUT", "ALREADY_EXISTS", "UNSUPPORTED", "IO_FAILURE",
);

const actionShape = shape<ActionAvailability>({
  allowed: boolean,
  blocker: nullable(oneOf(
    "PROVIDER_UNAVAILABLE", "NATIVE_MANAGED", "NOT_PROVISIONED",
    "INVALID_STATE", "READY_SNAPSHOT_MISSING", "READY_SNAPSHOT_EXISTS",
  )),
  reason: optional(text),
});
export const actionAvailability: PayloadValidator<ActionAvailability> = (value): value is ActionAvailability =>
  actionShape(value) && value.allowed === (value.blocker === null);

const actions = shape<ClientLifecycleActions>({
  id: virtualId,
  start: actionAvailability, startSetup: optional(actionAvailability), suspend: actionAvailability, stop: actionAvailability,
  open: actionAvailability, restart: actionAvailability, setReady: actionAvailability,
  reset: actionAvailability, reprovision: actionAvailability,
});
const clientShape = shape<ClientStatus>({
  id: clientId,
  native: boolean,
  state: oneOf("MANUAL", "NOT_PROVISIONED", "STOPPED", "SUSPENDED", "RUNNING", "ERROR"),
  readySnapshot: nullable(boolean),
  memoryLimitMb: nullable(integer), hostWorkingSetMb: nullable(integer),
  guestToolsReady: nullable(boolean), guestAgentReady: nullable(boolean),
  guestAgentVersion: nullable(text), minecraftVersion: nullable(text),
  lineageParity: nullable(parity), versionParity: nullable(parity),
  vmIdentity: nullable(identity), windowsIdentity: nullable(identity),
});
export const clientStatus: PayloadValidator<ClientStatus> = (value): value is ClientStatus =>
  clientShape(value) && value.native === (value.id === "Native") &&
  (value.native ? value.state === "MANUAL" : value.state !== "MANUAL");

export const clientList: PayloadValidator<ClientStatus[]> = (value): value is ClientStatus[] =>
  Array.isArray(value) && value.every(clientStatus) &&
  new Set(value.map((client) => client.id)).size === value.length;

export const lifecycleActions: PayloadValidator<ClientLifecycleActions[]> = (value): value is ClientLifecycleActions[] =>
  Array.isArray(value) && value.length === virtualIds.length && value.every(actions) &&
  new Set(value.map((client) => client.id)).size === virtualIds.length;

const runtimeStatus = shape({
  provider: nullable(text),
  runtimeProfile: shape({
    native: nullable(shape({ version: text })),
    base: nullable(shape({ minecraftVersion: text })),
    parity,
  }),
  pressure: shape({
    level: oneOf("NORMAL", "PRESSURE", "CRITICAL"),
    canStartVirtual: boolean,
  }),
  clients: (value) => clientList(value) && value.length === clientIds.length,
});
const doctor = shape({
  platform: text, provider: nullable(text), logicalCpus: integer,
  totalMemoryGb: number, availableMemoryGb: number, maxRecommendedVirtualClients: integer,
  baseVmPresent: boolean, baseVmStopped: nullable(boolean), baseState: nullable(baseState),
  readyForProvisioning: boolean,
  nextSetupAction: oneOf(
    "RUNTIME_DATA_INCOMPATIBLE", "INSTALL_PROVIDER", "INSTALL_NATIVE_MINECRAFT",
    "PREPARE_BASE", "REGISTER_BASE", "FINALIZE_BASE", "REBUILD_BASE",
    "PROVISION_VIRTUALS", "REPROVISION_VIRTUALS", "VERIFY_IDENTITIES",
    "CREATE_READY_SNAPSHOTS", "READY",
  ),
  issues: array(shape({
    code: text, severity: oneOf("BLOCKER", "WARNING"), client: nullable(virtualId),
  })),
});
export const engineSnapshot = shape<EngineSnapshot>({
  capturedAtUnixMs: integer,
  doctor,
  diagnostics: shape({
    appVersion: text,
    runtime: runtimeStatus,
    host: shape({
      os: nullable(text), osVersion: nullable(text), logicalCpus: integer,
      totalMemoryMb: integer, availableMemoryMb: integer,
    }),
    provider: shape({ id: nullable(text), version: nullable(text) }),
  }),
});
export const enginePolicy = shape<EnginePolicy>({
  maxVirtualClients: integer, virtualMemoryLimitMb: integer, virtualVcpus: integer,
  guestAgentPort: integer, readySnapshotName: text,
  nativeIsVersionAuthority: boolean, runtimeSelfUpdateEnabled: boolean,
});
export const basePreparation = shape<BasePreparationReport>({
  platform: text, provider: nullable(text), providerVersion: nullable(text),
  nativeVersion: nullable(text), nativeInstallType: nullable(text),
  baseExpectedPath: nullable(text), basePresent: boolean, baseStopped: nullable(boolean),
  baseState: nullable(baseState), configuredMemoryMb: nullable(integer),
  configuredVcpus: nullable(integer), graphics3dEnabled: nullable(boolean),
  networkPresent: nullable(boolean), networkStartConnected: nullable(boolean),
});
export const operationHistory: PayloadValidator<OperationRecord[]> = (value): value is OperationRecord[] =>
  array(shape({
    schema: oneOf(1), timestampUnixMs: integer,
    operation: oneOf(
      "STAGE_UPDATE", "REGISTER_BASE", "OPEN_BASE_FINALIZATION", "PROVISION",
      "REPROVISION", "VERIFY_IDENTITIES", "START", "SUSPEND", "STOP",
      "RESTART", "SET_READY", "RESET", "OPEN",
    ),
    target: nullable(text), outcome: oneOf("SUCCESS", "FAILED"),
    errorCode: nullable(errorCode), retryable: boolean,
  }))(value);
export const updateCheck = shape<UpdateCheck>({
  state: oneOf("UP_TO_DATE", "UPDATE_AVAILABLE", "UPDATE_STAGED", "UNAVAILABLE"),
  currentVersion: text, latestVersion: nullable(text), canApplyNow: boolean,
  selfUpdateEnabled: boolean, stagedPath: nullable(text), reason: nullable(text),
});
export const supportBundle = shape<SupportBundleResult>({ capturedAtUnixMs: integer, path: text });
export const baseProfile = shape<unknown>({
  schema: oneOf(3), minecraftVersion: text,
  nativeInstallType: oneOf("DESKTOP", "STORE", "APP_BUNDLE", "UNKNOWN"),
  guestStatusSchema: integer, guestAgentProtocol: positiveInteger, guestAgentVersion: text,
  baseGenerationId: hex64, source: oneOf("LIVE_VERIFIED"),
});
export const stagedUpdate = shape<unknown>({
  version: text, platform: text, installerPath: text, sha256: text, authenticodeThumbprint: text,
});
export const openedBase = shape<unknown>({ opened: oneOf(true) });
const displayInfo = shape<DisplayInfo>({
  index: integer, primary: boolean, width: positiveInteger, height: positiveInteger,
});
export const displayList: PayloadValidator<DisplayInfo[]> = (value): value is DisplayInfo[] =>
  Array.isArray(value) && value.length > 0 && value.every(displayInfo) &&
  new Set(value.map((display) => display.index)).size === value.length;
export const windowArrangement = shape<WindowArrangementResult>({
  schema: oneOf(2), layout: oneOf("GRID", "FOCUS", "COLUMNS"), displayIndex: integer,
  arranged: array(clientId), missing: array(clientId),
});
export const voidResult: PayloadValidator<void> = (value): value is void =>
  value === undefined || value === null;
