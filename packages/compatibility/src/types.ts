export type MinecraftEdition = "bedrock" | "education";
export type CapabilityTrack = "stable" | "preview" | "beta" | "experimental" | "education-only" | "unknown";

export interface GameVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface VersionRange {
  min?: GameVersion;
  maxExclusive?: GameVersion;
}

export interface CapabilityRule {
  id: string;
  editions: readonly MinecraftEdition[];
  track: CapabilityTrack;
  gameVersions?: VersionRange;
  requiresExperiment?: string;
  source: string;
  note?: string;
}

export interface CapabilityQuery {
  edition: MinecraftEdition;
  gameVersion?: GameVersion;
  experiments?: readonly string[];
}

export interface CapabilityResult {
  supported: boolean | "unknown";
  track: CapabilityTrack;
  reason: string;
  ruleId?: string;
}
