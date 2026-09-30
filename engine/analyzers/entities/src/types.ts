import type { SourceRef } from "../../../packages/project-model/src/index.js";

export interface EntityEventMutation {
  addGroups: string[];
  removeGroups: string[];
  triggerEvents: string[];
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
}

export interface EntityStateGraph {
  candidates: EntityStateCandidate[];
  eventEdges: Array<{
    event: string;
    adds: string[];
    removes: string[];
    triggers: string[];
  }>;
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
