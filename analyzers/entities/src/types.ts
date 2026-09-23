import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";

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
  componentGroups: Record<string, string[]>;
  events: Record<string, EntityEventMutation>;
}

export interface EntityStateCandidate {
  id: string;
  activeComponents: string[];
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
