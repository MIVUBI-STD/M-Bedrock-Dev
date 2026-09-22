import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";

export interface ScriptImport {
  module: string;
  kind: "minecraft" | "relative" | "external";
  bindings: string[];
  source: SourceRef;
}

export interface ScriptEventSubscription {
  root: "world" | "system" | "unknown";
  phase: "beforeEvents" | "afterEvents" | "unknown";
  event: string;
  source: SourceRef;
}

export interface DynamicPropertyAccess {
  operation: "get" | "set" | "delete" | "clear" | "ids" | "size" | "unknown";
  propertyId?: string;
  source: SourceRef;
}

export interface ScriptCapabilityUse {
  capability:
    | "world-access"
    | "system-access"
    | "event-subscription"
    | "dynamic-properties"
    | "script-event"
    | "unknown";
  detail?: string;
  source: SourceRef;
}

export interface ParsedScriptFile {
  identifier: string;
  source: SourceRef;
  imports: ScriptImport[];
  events: ScriptEventSubscription[];
  dynamicProperties: DynamicPropertyAccess[];
  capabilities: ScriptCapabilityUse[];
}
