import type { SourceRef } from "../../../packages/project-model/src/index.js";

export type ManifestModuleType =
  | "data"
  | "resources"
  | "script"
  | "world_template"
  | "skin_pack"
  | "persona_piece"
  | "unknown";

export interface ManifestModule {
  uuid?: string;
  type: ManifestModuleType;
  version?: unknown;
  entry?: string;
  language?: string;
}

export interface ManifestDependency {
  uuid?: string;
  moduleName?: string;
  version?: unknown;
}

export interface ManifestModel {
  formatVersion?: number | string;
  headerUuid?: string;
  headerVersion?: unknown;
  name?: string;
  description?: string;
  minEngineVersion?: unknown;
  modules: ManifestModule[];
  dependencies: ManifestDependency[];
  hasEducationMetadata?: boolean;
  source: SourceRef;
  raw: unknown;
}
