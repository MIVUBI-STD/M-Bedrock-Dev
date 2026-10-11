import type { SourceRef } from "../../../packages/project-model/src/index.js";

/** Bedrock-authored event operators, not confirmed gameplay execution. */
export interface EntityEventProgram {
  readonly kind: "mutation" | "sequence" | "randomize" | "unsupported";
  /** Exact JSON pointer inside the selected entity source. */
  readonly path: string;
  readonly filters?: unknown;
  readonly weight?: number;
  readonly addGroups?: readonly string[];
  readonly removeGroups?: readonly string[];
  readonly triggerEvents?: readonly string[];
  readonly steps?: readonly EntityEventProgram[];
  readonly reason?: string;
}

export interface EntityEventMutation {
  /** MAY references from all authored branches, not a simultaneous effect. */
  addGroups: string[];
  removeGroups: string[];
  triggerEvents: string[];
  /** Structured execution operators; absent only on historical input. */
  program?: EntityEventProgram;
}

export interface ParsedEntityDefinition {
  identifier?: string;
  runtimeIdentifier?: string;
  formatVersion?: string;
  source: SourceRef;
  baseComponents: string[];
  baseComponentData: Record<string, unknown>;
  componentGroups: Record<string, string[]>;
  componentGroupData: Record<string, Record<string, unknown>>;
  events: Record<string, EntityEventMutation>;
}

export interface EntityStateCandidate {
  id: string;
  activeComponents: string[];
  activeComponentData: Record<string, unknown>;
  activeGroups: string[];
  viaEvent?: string;
  /** Source-conditional possibility, not an observed runtime state. */
  sourceConditioned?: boolean;
  sourceEventPath?: readonly string[];
}

export interface EntityStateGraph {
  candidates: EntityStateCandidate[];
  eventEdges: Array<{
    event: string;
    adds: string[];
    removes: string[];
    triggers: string[];
    program?: EntityEventProgram;
  }>;
  /** Event semantics that cannot safely be interpreted as state paths. */
  staticAnalysisLimits?: readonly string[];
}

export interface NavigationCapabilities {
  navigationComponent?: string;
  canPassDoors?: boolean;
  canOpenDoors?: boolean;
  canOpenIronDoors?: boolean;
  canBreakDoors?: boolean;
  canPathOverWater?: boolean;
  canSwim?: boolean;
  canWalk?: boolean;
  canSink?: boolean;
  avoidWater?: boolean;
  avoidDamageBlocks?: boolean;
  capabilities: string[];
}
