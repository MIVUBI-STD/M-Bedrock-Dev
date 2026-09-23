export type KnowledgeAuthority =
  | "official"
  | "official-sample"
  | "community"
  | "observed";

export type KnowledgeConfidence =
  | "documented"
  | "observed"
  | "inferred";

export type KnowledgeEdition =
  | "bedrock"
  | "education";

export type KnowledgeDomain =
  | "commands"
  | "selectors"
  | "scoreboard"
  | "entities"
  | "entity-events"
  | "entity-ai"
  | "navigation"
  | "structures"
  | "script-api"
  | "chunks"
  | "education";

export interface KnowledgeSource {
  id: string;
  title: string;
  url: string;
  authority: KnowledgeAuthority;
  confidence: KnowledgeConfidence;
  publishedDate?: string;
  retrievedDate: string;
}

export interface VersionScope {
  minMinecraftVersion?: string;
  maxMinecraftVersion?: string;
  minFormatVersion?: string;
  maxFormatVersion?: string;
  scriptModule?: string;
  scriptModuleVersion?: string;
}

export interface KnowledgeApplicability {
  editions: readonly KnowledgeEdition[];
  experiments?: readonly string[];
  versions?: VersionScope;
}

export interface KnowledgeFact {
  id: string;
  domain: KnowledgeDomain;
  subject: string;
  statement: string;
  applicability: KnowledgeApplicability;
  sourceIds: readonly string[];
  capabilityTags: readonly string[];
  riskSurfaces: readonly string[];
  diagnosticHints?: readonly string[];
}

export interface KnowledgeCatalog {
  schemaVersion: 1;
  sources: readonly KnowledgeSource[];
  facts: readonly KnowledgeFact[];
}

export interface EffectiveKnowledgeProfile {
  edition: KnowledgeEdition;
  minecraftVersion?: string;
  formatVersion?: string;
  experiments?: readonly string[];
  scriptModules?: Readonly<Record<string, string>>;
}
