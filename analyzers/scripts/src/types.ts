import type { SourceRef } from "../../../packages/project-model/src/index.js";
import type { ScriptArgumentKind } from "../../../packages/compatibility/src/index.js";

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
  executionRegion?: string;
  callbackRegion?: string;
  callbackSource?: SourceRef;
  source: SourceRef;
}

export interface DynamicPropertyAccess {
  operation: "get" | "set" | "delete" | "clear" | "ids" | "size" | "unknown";
  propertyId?: string;
  receiverHint?: string;
  executionRegion?: string;
  source: SourceRef;
}

export interface RestrictedExecutionMutation {
  root: "world" | "system" | "unknown";
  context: "before-event" | "custom-command";
  event: string;
  method: string;
  symbol: string;
  operation: "call" | "write";
  evidence: "exact-symbol" | "contextual-fallback";
  ruleId: string;
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
  | "PlayerInputPermissions"
  | "Block"
  | "ItemStack"
  | "BlockPermutation"
  | "EntityFrictionModifierComponent"
  | "EntityMarkVariantComponent"
  | "EntityPushThroughComponent"
  | "EntityScaleComponent"
  | "EntitySkinIdComponent";

export type ScriptMethodResultUse =
  | "ignored"
  | "assigned"
  | "guarded-assigned"
  | "unguarded-assigned"
  | "guard-condition"
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
  receiverHint?: string;
  executionRegion?: string;
  argumentCount: number;
  argumentKinds: ScriptArgumentKind[];
  hasSpreadArgument: boolean;
  resultUse: ScriptMethodResultUse;
  source: SourceRef;
}

export interface ScriptPropertyWrite {
  receiverType: ScriptApiReceiverType;
  property: string;
  symbol: string;
  operation: "assign" | "compound" | "increment";
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

export interface ScriptBlockMatchGuard {
  receiverHint: string;
  receiverType: "Block" | "BlockPermutation";
  conditionSource: SourceRef;
  guardedSource: SourceRef;
  executionRegion: string;
}

export interface ScriptLocalFunctionCall {
  callerRegion: string;
  targetRegion: string;
  targetName: string;
  source: SourceRef;
}

export interface ScriptDeferredCallback {
  scheduler: "run" | "runTimeout" | "runInterval" | "runJob";
  source: SourceRef;
  callerRegion?: string;
  callbackRegion?: string;
  callbackSource?: SourceRef;
  guardEvidence: "explicit-generation-check" | "unresolved";
  guardIdentifiers: string[];
}

export interface ScriptEntityEventTrigger {
  event: string;
  receiverHint?: string;
  source: SourceRef;
}

export interface ScriptCommandLiteral {
  command: string;
  mechanism?: "runCommand" | "runCommandAsync" | "embedded-literal";
  executionRegion?: string;
  receiverHint?: string;
  source: SourceRef;
}

export interface ScriptLifecycleMemberExposure {
  member: string;
  candidateSymbols: string[];
  evidence: "exact-symbol" | "lexical-only";
  exactSymbol?: string;
  source: SourceRef;
}

export interface ScriptImportedSymbol {
  module: string;
  importedName: string;
  localName: string;
  typeOnly: boolean;
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

export interface ScriptEnumValueComparison {
  module: string;
  enumName: string;
  member: string;
  symbol: string;
  operator: "==" | "===" | "!=" | "!==";
  literal: string;
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
    | "api-property-write"
    | "api-module-member"
    | "api-imported-symbol"
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
  deferredCallbacks: ScriptDeferredCallback[];
  localFunctionCalls: ScriptLocalFunctionCall[];
  blockMatchGuards: ScriptBlockMatchGuard[];
  methodCalls: ScriptMethodCall[];
  propertyAccesses: ScriptPropertyAccess[];
  propertyWrites: ScriptPropertyWrite[];
  entityEventTriggers: ScriptEntityEventTrigger[];
  commandLiterals: ScriptCommandLiteral[];
  lifecycleMemberExposures: ScriptLifecycleMemberExposure[];
  moduleMemberAccesses: ScriptModuleMemberAccess[];
  importedSymbols: ScriptImportedSymbol[];
  enumValueComparisons: ScriptEnumValueComparison[];
  stateMutations?: ScriptStateMutation[];
  capabilities: ScriptCapabilityUse[];
}
