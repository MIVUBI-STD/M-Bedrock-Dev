export type ClientId = "MCE-01" | "MCE-02" | "MCE-03" | "MCE-04";

export type ClientLifecycleState =
  | "STOPPED"
  | "BOOTING"
  | "READY"
  | "MINECRAFT_RUNNING"
  | "IN_SESSION"
  | "UNHEALTHY"
  | "RESETTING";

export type StateImageName = "BASE_CLEAN" | "QA_READY";

export interface DeviceProfile {
  id: string;
  memoryMb: number;
  vcpus: number;
  viewport: { width: number; height: number };
  targetFps: number;
  minimumInteractiveFps: number;
  renderDistanceChunks: number;
  graphicsPreset: "low" | "balanced";
}

export interface LabClientDefinition {
  id: ClientId;
  runtime: "native" | "virtual";
  profileId: string;
  provider: "auto" | string;
}

export interface ScenarioDefinition {
  id: string;
  requiredClients: 1 | 2 | 3 | 4;
  mode: "interactive" | "assisted";
  description: string;
  roleSlots: string[];
}

export interface ClientHealth {
  clientId: ClientId;
  lifecycle: ClientLifecycleState;
  fps: number | null;
  memoryPressure: "LOW" | "MODERATE" | "HIGH" | "UNKNOWN";
  networkReachable: boolean;
  minecraftVersion: string | null;
  reasons: string[];
}

export interface LabHealth {
  validForRuntimeProof: boolean;
  clients: ClientHealth[];
  reasons: string[];
}

export interface RuntimeProviderCapabilities {
  platform: "windows" | "macos";
  snapshots: boolean;
  linkedClones: boolean;
  screenshots: boolean;
  interactiveConsole: boolean;
}

export interface RuntimeProvider {
  readonly id: string;
  doctor(): Promise<RuntimeProviderCapabilities>;
  startClient(clientId: ClientId): Promise<void>;
  stopClient(clientId: ClientId): Promise<void>;
  getClientState(clientId: ClientId): Promise<ClientLifecycleState>;
  restoreState(clientId: ClientId, state: StateImageName): Promise<void>;
  captureScreen(clientId: ClientId): Promise<Uint8Array>;
  openInteractiveConsole(clientId: ClientId): Promise<void>;
}
