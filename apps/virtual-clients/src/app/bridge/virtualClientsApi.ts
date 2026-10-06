import {
  parseErrorEnvelope,
  parseSuccessEnvelope,
  type BasePreparationReport,
  type ClientId,
  type ClientLifecycleActions,
  type EnginePolicy,
  type EngineSnapshot,
  type OperationRecord,
  type SupportBundleResult,
  type UpdateCheck,
  type WindowArrangementResult,
} from "../../contracts.js";
import { invokeRuntime } from "./invokeRuntime.js";

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

async function invokePublic<T>(tauriCommand: string, args?: Record<string, unknown>): Promise<T> {
  try {
    const raw = await invokeRuntime<string>(tauriCommand, args);
    const report = parseErrorEnvelope(raw);
    if (report) throw new BackendBridgeError(report.code, report.message, report.retryable);
    return parseSuccessEnvelope<T>(raw);
  } catch (error) {
    if (error instanceof BackendBridgeError) throw error;
    if (typeof error === "string") {
      const report = parseErrorEnvelope(error);
      if (report) throw new BackendBridgeError(report.code, report.message, report.retryable);
      throw new BackendBridgeError("TAURI_COMMAND_FAILED", error, false);
    }
    if (error instanceof Error) throw new BackendBridgeError("TAURI_COMMAND_FAILED", error.message, false);
    throw new BackendBridgeError("TAURI_COMMAND_FAILED", String(error), false);
  }
}

async function invokeDesktop<T>(command: string): Promise<T> {
  try {
    return await invokeRuntime<T>(command);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BackendBridgeError("DESKTOP_OPERATION_FAILED", message, true);
  }
}

export const desktop = {
  canArrangeWindows: () => true,
  arrangeWindows: () => invokeDesktop<WindowArrangementResult>("window_arrange"),
  openBaseLocation: () => invokeDesktop<void>("setup_open_base_location"),
  openSetupTools: () => invokeDesktop<void>("setup_open_guest_tools")
};

export const backend = {
  policy: () => invokePublic<EnginePolicy>("virtual_clients_policy"),
  basePreflight: () => invokePublic<BasePreparationReport>("virtual_clients_base_preflight"),
  snapshot: () => invokePublic<EngineSnapshot>("virtual_clients_snapshot"),
  actions: () => invokePublic<ClientLifecycleActions[]>("virtual_clients_actions"),
  history: () => invokePublic<OperationRecord[]>("virtual_clients_history"),
  supportBundle: () => invokePublic<SupportBundleResult>("virtual_clients_support_bundle"),
  checkUpdate: () => invokePublic<UpdateCheck>("virtual_clients_check_update"),
  registerBase: () => invokePublic<unknown>("virtual_clients_register_base"),
  provision: () => invokePublic<unknown>("virtual_clients_provision"),
  verifyIdentities: () => invokePublic<unknown>("virtual_clients_verify_identities"),
  stageUpdate: () => invokePublic<unknown>("virtual_clients_stage_update"),
  start: (count: number) => invokePublic<unknown>("virtual_clients_start", { count }),
  suspend: (client?: ClientId) => invokePublic<unknown>("virtual_clients_suspend", { client }),
  stop: (client?: ClientId) => invokePublic<unknown>("virtual_clients_stop", { client }),
  restart: (client: ClientId) => invokePublic<unknown>("virtual_clients_restart", { client }),
  setReady: (client: ClientId) => invokePublic<unknown>("virtual_clients_set_ready", { client }),
  reset: (client: ClientId) => invokePublic<unknown>("virtual_clients_reset", { client }),
  open: (client: ClientId) => invokePublic<unknown>("virtual_clients_open", { client }),
  reprovision: (client: ClientId) => invokePublic<unknown>("virtual_clients_reprovision", { client })
};
