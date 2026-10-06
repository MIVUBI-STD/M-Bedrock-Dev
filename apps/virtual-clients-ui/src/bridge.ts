import {
  parseErrorEnvelope,
  parseSuccessEnvelope,
  type ClientId,
  type ClientLifecycleActions,
  type EnginePolicy,
  type EngineSnapshot,
  type OperationRecord,
  type SupportBundleResult,
} from "./contracts.js";

export type BackendCommand =
  | "policy"
  | "snapshot"
  | "actions"
  | "history"
  | "support-bundle"
  | "register-base"
  | "provision"
  | "verify-identities"
  | "stage-update"
  | "start"
  | "suspend"
  | "stop"
  | "restart"
  | "set-ready"
  | "reset"
  | "open"
  | "reprovision";

interface HostBridge {
  invoke(command: BackendCommand, args: readonly string[]): Promise<string>;
}

declare global {
  interface Window {
    virtualClients?: HostBridge;
  }
}

export class BackendBridgeError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "BackendBridgeError";
    this.code = code;
    this.retryable = retryable;
  }
}

function host(): HostBridge {
  if (!window.virtualClients) {
    throw new BackendBridgeError(
      "BACKEND_BRIDGE_UNAVAILABLE",
      "Backend bridge unavailable. Connect the desktop host to use Virtual Clients.",
      true,
    );
  }
  return window.virtualClients;
}

async function invoke<T>(command: BackendCommand, args: readonly string[] = []): Promise<T> {
  try {
    const raw = await host().invoke(command, args);
    const report = parseErrorEnvelope(raw);
    if (report) {
      throw new BackendBridgeError(report.code, report.message, report.retryable);
    }
    return parseSuccessEnvelope<T>(raw);
  } catch (error) {
    if (error instanceof BackendBridgeError) throw error;
    if (typeof error === "string") {
      const report = parseErrorEnvelope(error);
      if (report) throw new BackendBridgeError(report.code, report.message, report.retryable);
    }
    if (error instanceof Error) {
      const report = parseErrorEnvelope(error.message);
      if (report) throw new BackendBridgeError(report.code, report.message, report.retryable);
      throw error;
    }
    throw new BackendBridgeError("BRIDGE_FAILURE", String(error), false);
  }
}

export const backend = {
  policy: () => invoke<EnginePolicy>("policy"),
  snapshot: () => invoke<EngineSnapshot>("snapshot"),
  actions: () => invoke<ClientLifecycleActions[]>("actions"),
  history: () => invoke<OperationRecord[]>("history"),
  supportBundle: () => invoke<SupportBundleResult>("support-bundle"),
  registerBase: () => invoke<unknown>("register-base"),
  provision: () => invoke<unknown>("provision"),
  verifyIdentities: () => invoke<unknown>("verify-identities"),
  stageUpdate: () => invoke<unknown>("stage-update"),
  start: (count: number) => invoke<unknown>("start", [String(count)]),
  suspend: (client?: ClientId) => invoke<unknown>("suspend", client ? [client] : []),
  stop: (client?: ClientId) => invoke<unknown>("stop", client ? [client] : []),
  restart: (client: ClientId) => invoke<unknown>("restart", [client]),
  setReady: (client: ClientId) => invoke<unknown>("set-ready", [client]),
  reset: (client: ClientId) => invoke<unknown>("reset", [client]),
  open: (client: ClientId) => invoke<unknown>("open", [client]),
  reprovision: (client: ClientId) =>
    invoke<unknown>("reprovision", [client, "--destroy-account-state"]),
};
