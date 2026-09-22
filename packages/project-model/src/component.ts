import type { SourceRef } from "./source-ref.js";

export type ComponentKind =
  | "world"
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
  | "scoreboard_objective"
  | "tag"
  | "unknown";

export interface ComponentIdentity {
  id: string;
  kind: ComponentKind;
  namespace?: string;
  identifier: string;
}

export interface ProjectComponent {
  identity: ComponentIdentity;
  source: SourceRef;
  contentHash?: string;
  semanticHash?: string;
  parserVersion?: string;
}
