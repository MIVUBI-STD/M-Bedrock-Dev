import type { SourceRef } from "./source-ref.js";

export type ComponentKind =
  | "pack"
  | "manifest"
  | "function"
  | "command"
  | "structure"
  | "entity"
  | "animation"
  | "animation_controller"
  | "loot_table"
  | "spawn_rule"
  | "item"
  | "block"
  | "recipe"
  | "script_module"
  | "script_file"
  | "dialogue_scene"
  | "scoreboard_objective"
  | "tag"
  | "world"
  | "unknown";

export interface ComponentIdentity {
  kind: ComponentKind;
  scope: string;
  identifier: string;
}

export interface ProjectComponent {
  id: string;
  identity: ComponentIdentity;
  source: SourceRef;
  contentHash?: string;
  semanticHash?: string;
  parserVersion?: string;
  data?: unknown;
}
