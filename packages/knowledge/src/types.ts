export type KnowledgeAuthority =
  | "official"
  | "official-sample"
  | "community"
  | "observed"
  | "project-policy";

export type KnowledgeConfidence =
  | "documented"
  | "observed"
  | "inferred"
  | "designed";

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
  | "player-session"
  | "multiplayer"
  | "event-ordering"
  | "state-authority"
  | "player-life"
  | "command-context"
  | "world-mutation"
  | "persistence"
  | "performance"
  | "education";

export type KnowledgeRelationKind =
  | "requires"
  | "requires-any"
  | "produces"
  | "activates"
  | "deactivates"
  | "gates"
  | "supersedes"
  | "delayed-until-tick"
  | "runtime-built-in"
  | "validates"
  | "fallbacks-to"
  | "restores"
  | "queues-behind";

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

export type KnowledgeClassification =
  | "engine-fact"
  | "derived-rule"
  | "project-policy"
  | "open-assumption";

export interface KnowledgeFact {
  id: string;
  domain: KnowledgeDomain;
  subject: string;
  statement: string;
  classification?: KnowledgeClassification;
  applicability: KnowledgeApplicability;
  sourceIds: readonly string[];
  capabilityTags: readonly string[];
  riskSurfaces: readonly string[];
  diagnosticHints?: readonly string[];
}

export interface KnowledgeRelation {
  id: string;
  domain: KnowledgeDomain;
  subject: string;
  kind: KnowledgeRelationKind;
  object: string;
  classification?: KnowledgeClassification;
  applicability: KnowledgeApplicability;
  sourceIds: readonly string[];
  diagnosticHint?: string;
}

export interface KnowledgeCatalog {
  schemaVersion: 1;
  sources: readonly KnowledgeSource[];
  facts: readonly KnowledgeFact[];
  relations?: readonly KnowledgeRelation[];
}

export interface EffectiveKnowledgeProfile {
  edition: KnowledgeEdition;
  minecraftVersion?: string;
  formatVersion?: string;
  experiments?: readonly string[];
  scriptModules?: Readonly<Record<string, string>>;
}
