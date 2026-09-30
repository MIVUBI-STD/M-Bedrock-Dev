import type {
  KnowledgeAuthority,
  KnowledgeClassification,
  KnowledgeConfidence,
  KnowledgeDomain,
  KnowledgeEdition,
  KnowledgeRelationKind,
} from "./types.js";

export const KNOWLEDGE_AUTHORITIES = [
  "official",
  "official-sample",
  "community",
  "observed",
  "project-policy",
] as const satisfies readonly KnowledgeAuthority[];

export const KNOWLEDGE_CONFIDENCES = [
  "documented",
  "observed",
  "inferred",
  "designed",
] as const satisfies readonly KnowledgeConfidence[];

export const KNOWLEDGE_EDITIONS = [
  "bedrock",
  "education",
] as const satisfies readonly KnowledgeEdition[];

export const KNOWLEDGE_CLASSIFICATIONS = [
  "engine-fact",
  "derived-rule",
  "project-policy",
  "open-assumption",
] as const satisfies readonly KnowledgeClassification[];

export const KNOWLEDGE_DIAGNOSTIC_SEVERITIES = [
  "info",
  "minor",
  "medium",
  "critical",
] as const;

export const KNOWLEDGE_RELATION_KINDS = [
  "requires",
  "requires-any",
  "produces",
  "activates",
  "deactivates",
  "gates",
  "supersedes",
  "delayed-until-tick",
  "runtime-built-in",
  "validates",
  "fallbacks-to",
  "restores",
  "queues-behind",
] as const satisfies readonly KnowledgeRelationKind[];

export const KNOWLEDGE_DOMAINS = [
  "commands",
  "selectors",
  "scoreboard",
  "entities",
  "entity-events",
  "entity-ai",
  "navigation",
  "structures",
  "script-api",
  "chunks",
  "player-session",
  "multiplayer",
  "event-ordering",
  "state-authority",
  "player-life",
  "command-context",
  "world-mutation",
  "persistence",
  "performance",
  "interaction",
  "inventory",
  "teleport",
  "entity-runtime",
  "combat",
  "round-integrity",
  "arena-cleanup",
  "compatibility",
  "automation",
  "entity-population",
  "effects",
  "cinematic",
  "client-feedback",
  "loot-economy",
  "permissions",
  "world-state",
  "spatial-containment",
  "interactive-blocks",
  "input-gesture",
  "physics",
  "mounts",
  "npc-dialogue",
  "environment-hazards",
  "observability",
  "validation",
  "education-runtime",
  "education",
] as const satisfies readonly KnowledgeDomain[];

export const KNOWLEDGE_DOMAIN_SET = new Set<string>(KNOWLEDGE_DOMAINS);
export const KNOWLEDGE_RELATION_KIND_SET = new Set<string>(KNOWLEDGE_RELATION_KINDS);
export const KNOWLEDGE_CLASSIFICATION_SET = new Set<string>(KNOWLEDGE_CLASSIFICATIONS);
export const KNOWLEDGE_AUTHORITY_SET = new Set<string>(KNOWLEDGE_AUTHORITIES);
export const KNOWLEDGE_CONFIDENCE_SET = new Set<string>(KNOWLEDGE_CONFIDENCES);
export const KNOWLEDGE_EDITION_SET = new Set<string>(KNOWLEDGE_EDITIONS);

export const KNOWLEDGE_DIAGNOSTIC_SEVERITY_SET = new Set<string>(KNOWLEDGE_DIAGNOSTIC_SEVERITIES);
