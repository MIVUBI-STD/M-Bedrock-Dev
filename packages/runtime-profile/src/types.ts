export type MinecraftProductEdition =
  | "bedrock-retail"
  | "bedrock-preview"
  | "education";

export type MinecraftRuntimeHost =
  | "client"
  | "listen-server"
  | "dedicated-server"
  | "realm"
  | "education-host"
  | "editor";

export type ScriptModuleTrack =
  | "stable"
  | "beta"
  | "experimental"
  | "internal"
  | "unknown";

export type InventoryCompleteness =
  | "complete"
  | "partial"
  | "unknown";

export interface RuntimeScriptModuleProfile {
  version: string;
  track: ScriptModuleTrack;
}

export interface RuntimeInventoryCompleteness {
  scriptModules: InventoryCompleteness;
  experiments: InventoryCompleteness;
  worldSettings: InventoryCompleteness;
  packs: InventoryCompleteness;
}

export interface MinecraftRuntimeProfile {
  schemaVersion: 2;
  product: {
    family: "bedrock-engine";
    edition: MinecraftProductEdition;
    version: string;
    build?: string;
  };
  host: MinecraftRuntimeHost;
  scriptModules: Readonly<Record<string, RuntimeScriptModuleProfile>>;
  experiments: readonly string[];
  inventory: RuntimeInventoryCompleteness;
  world?: {
    educationFeatures?: boolean;
    eduLevel?: number;
    commandsEnabled?: boolean;
    commandBlocksEnabled?: boolean;
    difficulty?: string;
    simulationDistance?: number;
    serverChunkTickRange?: number;
    gamerules?: Readonly<Record<string, unknown>>;
  };
  packs?: {
    minEngineVersions?: readonly string[];
    formatVersions?: readonly string[];
  };
  runtime?: {
    playerCount?: number;
    platform?: string;
    dedicatedServerConfigHash?: string;
  };
}
