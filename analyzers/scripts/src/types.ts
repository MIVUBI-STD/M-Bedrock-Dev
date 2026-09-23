import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type { ScriptArgumentKind } from "../../../packages/compatibility/src/script-signature-matrix.js";

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

export interface RestrictedExecutionMutation {
  root: "world" | "system" | "unknown";
  event: string;
  method: string;
  source: SourceRef;
}

export type ScriptApiReceiverType =
  | "World"
  | "System"
  | "Player"
  | "Entity"
  | "Dimension"
  | "Scoreboard"
  | "ScoreboardObjective"
  | "PlayerInputPermissions";

export type ScriptMethodResultUse =
  | "ignored"
  | "assigned"
  | "returned"
  | "dereferenced"
  | "optional-dereferenced"
  | "non-null-asserted"
  | "other";

export interface ScriptMethodCall {
  receiverType: ScriptApiReceiverType;
  root?: "world" | "system";
  method: string;
  symbol: string;
  inference: "direct" | "bounded";
  argumentCount: number;
  argumentKinds: ScriptArgumentKind[];
  hasSpreadArgument: boolean;
  resultUse: ScriptMethodResultUse;
  source: SourceRef;
}

export interface ScriptPropertyAccess {
  receiverType: ScriptApiReceiverType;
  root?: "world" | "system";
  property: string;
  symbol: string;
  inference: "direct" | "bounded";
  source: SourceRef;
}

export interface ScriptModuleMemberAccess {
  module: string;
  importedName: string;
  localName: string;
  member: string;
  symbol: string;
  source: SourceRef;
}

export interface ScriptCapabilityUse {
  capability:
    | "world-access"
    | "system-access"
    | "event-subscription"
    | "dynamic-properties"
    | "script-event"
    | "restricted-execution"
    | "early-execution"
    | "api-method"
    | "api-property"
    | "api-module-member"
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
  restrictedMutations: RestrictedExecutionMutation[];
  methodCalls: ScriptMethodCall[];
  propertyAccesses: ScriptPropertyAccess[];
  moduleMemberAccesses: ScriptModuleMemberAccess[];
  capabilities: ScriptCapabilityUse[];
}
