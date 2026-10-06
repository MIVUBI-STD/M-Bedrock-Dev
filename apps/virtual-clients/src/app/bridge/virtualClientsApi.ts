import { Channel } from "@tauri-apps/api/core";
import { isOperationProgress, type ProgressObserver } from "../operationProgress.js";
import {
  parseErrorEnvelope,
  parseSuccessEnvelope,
  type PayloadValidator,
  type BasePreparationReport,
  type ClientId,
  type ClientLifecycleActions,
  type EnginePolicy,
  type EngineSnapshot,
  type OperationRecord,
  type SupportBundleResult,
  type UpdateCheck,
  type DisplayInfo,
  type WindowArrangementResult,
  type WindowLayoutRequest,
} from "../../contracts.js";
import { invokeRuntime } from "./invokeRuntime.js";
import * as payload from "./payloadValidation.js";

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

async function invokePublic<T>(tauriCommand: string, validate: PayloadValidator<T>, args?: Record<string, unknown>, onProgress?: ProgressObserver): Promise<T> {
  let active = true;
  const channel = onProgress ? new Channel<unknown>() : undefined;
  if (channel) channel.onmessage = (event) => {
    if (active) onProgress?.(isOperationProgress(event) ? event : undefined);
  };
  try {
    const raw = await invokeRuntime<string>(tauriCommand, channel ? { ...args, onProgress: channel } : args);
    const report = parseErrorEnvelope(raw);
    if (report) throw new BackendBridgeError(report.code, report.message, report.retryable);
    return parseSuccessEnvelope<T>(raw, validate);
  } catch (error) {
    if (error instanceof BackendBridgeError) throw error;
    if (typeof error === "string") {
      const report = parseErrorEnvelope(error);
      if (report) throw new BackendBridgeError(report.code, report.message, report.retryable);
      throw new BackendBridgeError("TAURI_COMMAND_FAILED", error, false);
    }
    if (error instanceof Error) throw new BackendBridgeError("TAURI_COMMAND_FAILED", error.message, false);
    throw new BackendBridgeError("TAURI_COMMAND_FAILED", String(error), false);
  } finally {
    active = false;
    if (channel) channel.onmessage = () => {};
  }
}

async function invokeDesktop<T>(command: string, validate: PayloadValidator<T>, args?: Record<string, unknown>): Promise<T> {
  try {
    const result = await invokeRuntime<unknown>(command, args);
    if (!validate(result)) throw new Error("Desktop response does not match its command contract.");
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BackendBridgeError("DESKTOP_OPERATION_FAILED", message, true);
  }
}

export const desktop = {
  canArrangeWindows: () => true,
  displays: () => invokeDesktop<DisplayInfo[]>("window_displays", payload.displayList),
  arrangeWindows: (request: WindowLayoutRequest) => invokeDesktop<WindowArrangementResult>("window_arrange", payload.windowArrangement, { request }),
  openBaseLocation: () => invokeDesktop<void>("setup_open_base_location", payload.voidResult),
  openSetupTools: () => invokeDesktop<void>("setup_open_guest_tools", payload.voidResult)
};

export const backend = {
  policy: () => invokePublic<EnginePolicy>("virtual_clients_policy", payload.enginePolicy),
  basePreflight: () => invokePublic<BasePreparationReport>("virtual_clients_base_preflight", payload.basePreparation),
  snapshot: () => invokePublic<EngineSnapshot>("virtual_clients_snapshot", payload.engineSnapshot),
  actions: () => invokePublic<ClientLifecycleActions[]>("virtual_clients_actions", payload.lifecycleActions),
  history: () => invokePublic<OperationRecord[]>("virtual_clients_history", payload.operationHistory),
  supportBundle: (onProgress?: ProgressObserver) => invokePublic<SupportBundleResult>("virtual_clients_support_bundle", payload.supportBundle, undefined, onProgress),
  checkUpdate: () => invokePublic<UpdateCheck>("virtual_clients_check_update", payload.updateCheck),
  registerBase: (onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_register_base", payload.baseProfile, undefined, onProgress),
  openBaseFinalization: (onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_open_base_finalization", payload.openedBase, undefined, onProgress),
  provision: (onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_provision", payload.clientList, undefined, onProgress),
  verifyIdentities: (onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_verify_identities", payload.clientList, undefined, onProgress),
  stageUpdate: (onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_stage_update", payload.stagedUpdate, undefined, onProgress),
  start: (count: number, onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_start", payload.clientList, { count }, onProgress),
  startSetup: (client: ClientId, onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_start_setup", payload.clientStatus, { client }, onProgress),
  startClient: (client: ClientId, onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_start_client", payload.clientStatus, { client }, onProgress),
  suspend: (client?: ClientId, onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_suspend", payload.clientList, { client }, onProgress),
  stop: (client?: ClientId, onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_stop", payload.clientList, { client }, onProgress),
  restart: (client: ClientId, onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_restart", payload.clientStatus, { client }, onProgress),
  setReady: (client: ClientId, onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_set_ready", payload.clientStatus, { client }, onProgress),
  reset: (client: ClientId, onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_reset", payload.clientStatus, { client }, onProgress),
  open: (client: ClientId, onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_open", payload.clientStatus, { client }, onProgress),
  reprovision: (client: ClientId, onProgress?: ProgressObserver) => invokePublic<unknown>("virtual_clients_reprovision", payload.clientStatus, { client }, onProgress)
};
