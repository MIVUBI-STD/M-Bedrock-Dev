import type { BlockCustomComponentRegistrationEvidence } from "../domains/automation/block-custom-component-evidence.js";
import type { PersistentReconciliationEvidence } from "../domains/persistence/persistent-reconciliation.js";
import type { ScriptEconomyEvidence } from "../domains/economy/economy-evidence.js";
import type {
  ScriptProgressionActorRegistryEvidence,
  ScriptProgressionActorSpawnEvidence,
  ScriptProgressionCounterEvidence,
} from "../domains/progression/progression-counter-evidence.js";
import type { ScriptChunkLifecycleEvidence } from "../domains/chunk/chunk-lifecycle-evidence.js";
import type { ScriptCombatLifecycleEvidence } from "../domains/combat/combat-lifecycle-evidence.js";
import type { ScriptInventoryLifecycleEvidence } from "../domains/inventory/inventory-lifecycle-evidence.js";
import type { ScriptGlobalLeaseEvidence } from "../domains/arena/global-lease-evidence.js";
import type { ScriptCleanupResourceEvidence } from "../domains/cleanup/cleanup-resource-evidence.js";
import type {
  PersistentDataLifecycleEvidence,
  ScriptResultAuditRecordEvidence,
} from "../domains/persistence/persistent-data-lifecycle.js";
import type { PersistentStateScopeEvidence } from "../domains/persistence/persistent-state-scope.js";
import type { PersistentStateLifetimeEvidence } from "../domains/persistence/persistent-state-lifetime.js";
import type { ScriptSpatialMutationEvidence, ScriptSpatialMutationRejection } from "../domains/spatial/spatial-mutation-evidence.js";
import type { ScriptSafeConfigBinding, ScriptSafeConfigExport, ScriptSafeConfigFunction, ScriptSafeConfigImport, ScriptSafeConfigRejection } from "../config/safe-config-compiler.js";
import type {
  RepairSourceTransformHint,
  SourceRef,
} from "../../../../packages/project-model/src/index.js";
import type { ScriptArgumentKind } from "../../../../packages/compatibility/src/index.js";

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
  propertyExpression?: string;
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
  argumentTexts?: string[];
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

/** Source-authored lexical condition; runtime satisfaction is unknown. */
export interface ScriptLexicalGuard {
  conditionText: string;
  branch: "true" | "false";
  predicate: ScriptGuardPredicate;
  source: SourceRef;
}

export interface ScriptLocalFunctionCall {
  callerRegion: string;
  targetRegion: string;
  targetName: string;
  controlFlow?: "unconditional" | "conditional" | "deferred";
  lexicalGuards?: readonly ScriptLexicalGuard[];
  /** Necessary branch decisions from preceding single-statement exits. */
  precedenceGuards?: readonly ScriptLexicalGuard[];
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
  delayTicks?: number;
}

export interface ScriptEntityEventTrigger {
  event: string;
  receiverHint?: string;
  executionRegion?: string;
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

export interface ScriptStateMutation {
  lexicalGuards?: readonly ScriptLexicalGuard[];
  precedenceGuards?: readonly ScriptLexicalGuard[];
  target: string;
  targetName: string;
  value:
    | { kind: "literal"; literal: string }
    | {
        kind: "member";
        owner: string;
        member: string;
        symbol: string;
      };
  executionRegion: string;
  source: SourceRef;
}

export interface ScriptTypeProperty {
  containerName: string;
  propertyName: string;
  typeText: string;
  optional: boolean;
  source: SourceRef;
}

export interface ScriptTransitionDeclaration {
  tableName: string;
  stateType?: string;
  from: string;
  to: readonly string[];
  source: SourceRef;
}

export interface ScriptReturnOutcome {
  /** Lexical ancestry only; not an exhaustive execution path. */
  lexicalGuards?: readonly ScriptLexicalGuard[];
  precedenceGuards?: readonly ScriptLexicalGuard[];
  executionRegion: string;
  propertyName: string;
  value: string;
  source: SourceRef;
}

export interface ScriptDeclaredMember {
  member: string;
  memberKind: "method" | "property";
  containerHint?: string;
  source: SourceRef;
}

export interface ScriptSpatialRoutePoint {
  routeId: string;
  location: {
    x: number;
    y: number;
    z: number;
  };
  index?: number;
  collectionHint?: string;
  source: SourceRef;
}

export interface ScriptSpatialOffsetTransform {
  functionName: string;
  pointParameter: string;
  contextParameter: string;
  offsetPath: string;
  source: SourceRef;
}

export interface ScriptSpatialTransformUse {
  functionName: string;
  pointExpression: string;
  contextExpression: string;
  source: SourceRef;
}

export interface ScriptSpatialWorldMutation {
  method:
    | "setBlockType"
    | "setBlockPermutation"
    | "fillBlocks";
  executionRegion: string;
  status: "resolved" | "unresolved";
  volume?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  writeIdentity?: string;
  reason?: string;
  source: SourceRef;
}

export interface ScriptSpatialContextOffsetSeries {
  collectionName: string;
  sourceCollectionName: string;
  contextCount: number;
  offsetPath: string;
  offsetBase: {
    x: number;
    y: number;
    z: number;
  };
  offsetStride: {
    x: number;
    y: number;
    z: number;
  };
  contextIdPrefix?: string;
  contextIdIndexBase?: number;
  source: SourceRef;
}

export type ScriptGuardScalar =
  | string
  | number
  | boolean
  | null;

export type ScriptGuardOperand =
  | { kind: "path"; path: string }
  | { kind: "literal"; value: ScriptGuardScalar }
  | {
      kind: "index";
      base: ScriptGuardOperand;
      key: ScriptGuardOperand;
    };

export type ScriptGuardPredicate =
  | {
      kind: "truthy";
      operand: ScriptGuardOperand;
    }
  | {
      kind: "falsy";
      operand: ScriptGuardOperand;
    }
  | {
      kind: "comparison";
      operator: "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
      left: ScriptGuardOperand;
      right: ScriptGuardOperand;
    }
  | {
      kind: "all" | "any";
      predicates: readonly ScriptGuardPredicate[];
    }
  | {
      kind: "in";
      operand: ScriptGuardOperand;
      values: readonly ScriptGuardScalar[];
    }
  | {
      kind: "fallback";
      excludedPredicates: readonly ScriptGuardPredicate[];
    }
  | {
      kind: "unknown";
      text: string;
    };

export interface ScriptGuardedOutcome {
  executionRegion: string;
  conditionText: string;
  conditionIdentifiers: readonly string[];
  predicate: ScriptGuardPredicate;
  propertyName: string;
  value: string;
  conditionSource: SourceRef;
  outcomeSource: SourceRef;
}

export interface ScriptArenaAuthorityEvidence {
  kind:
    | "membership-commit"
    | "membership-release"
    | "capacity-operand"
    | "capacity-check"
    | "arena-generation-operand"
    | "generation-invalidate"
    | "start-owner-guard"
    | "start-owner-acquire"
    | "start-state-commit"
    | "ready-set-snapshot-risk";
  arenaExpression: string;
  subjectExpression?: string;
  membershipExpression?: string;
  capacityExpression?: string;
  ownerExpression?: string;
  generationExpression?: string;
  stateExpression?: string;
  snapshotExpression?: string;
  revalidationExpression?: string;
  executionRegion: string;
  source: SourceRef;
  /** Present only for an authored direct statement within one lexical block. */
  sequentialBlockSource?: SourceRef;
}

export interface ScriptArenaAuthorityPath {
  arenaExpression: string;
  executionRegion: string;
  membershipCommit?: ScriptArenaAuthorityEvidence;
  membershipRelease?: ScriptArenaAuthorityEvidence;
  capacityOperand?: ScriptArenaAuthorityEvidence;
  capacityCheck?: ScriptArenaAuthorityEvidence;
  generationOperand?: ScriptArenaAuthorityEvidence;
  generationInvalidation?: ScriptArenaAuthorityEvidence;
  startOwnerGuard?: ScriptArenaAuthorityEvidence;
  startOwnerAcquire?: ScriptArenaAuthorityEvidence;
  startStateCommit?: ScriptArenaAuthorityEvidence;
  capacityAuthorityProven: boolean;
  startAuthorityProven: boolean;
  startGuardProven: boolean;
}

export interface ScriptPersistenceIdempotencyGuard {
  propertyKey: string;
  appliedExpression: string;
  journalExpression: string;
  sideEffectExpression: string;
  executionRegion: string;
  conditionSource: SourceRef;
  sideEffectSource: SourceRef;
  journalWriteSource: SourceRef;
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
  blockCustomComponentRegistrations?: BlockCustomComponentRegistrationEvidence[];
  persistentReconciliation?: PersistentReconciliationEvidence;
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
  typeProperties?: ScriptTypeProperty[];
  transitionDeclarations?: ScriptTransitionDeclaration[];
  returnOutcomes?: ScriptReturnOutcome[];
  guardedOutcomes?: ScriptGuardedOutcome[];
  declaredMembers?: ScriptDeclaredMember[];
  spatialRoutePoints?: ScriptSpatialRoutePoint[];
  spatialOffsetTransforms?: ScriptSpatialOffsetTransform[];
  spatialTransformUses?: ScriptSpatialTransformUse[];
  spatialContextOffsetSeries?: ScriptSpatialContextOffsetSeries[];
  spatialMutations?: ScriptSpatialMutationEvidence[];
  spatialMutationRejected?: ScriptSpatialMutationRejection[];
  spatialWorldMutations?: ScriptSpatialWorldMutation[];
  cleanupResourceEvidence?: ScriptCleanupResourceEvidence[];
  chunkLifecycleEvidence?: ScriptChunkLifecycleEvidence[];
  combatLifecycleEvidence?: ScriptCombatLifecycleEvidence[];
  economyEvidence?: ScriptEconomyEvidence[];
  progressionCounterEvidence?: ScriptProgressionCounterEvidence[];
  progressionActorSpawnEvidence?: ScriptProgressionActorSpawnEvidence[];
  progressionActorRegistryEvidence?: ScriptProgressionActorRegistryEvidence[];
  inventoryLifecycleEvidence?: ScriptInventoryLifecycleEvidence[];
  globalLeaseEvidence?: ScriptGlobalLeaseEvidence[];
  persistentDataLifecycleEvidence?: PersistentDataLifecycleEvidence[];
  resultAuditRecordEvidence?: ScriptResultAuditRecordEvidence[];
  persistentStateScopes?: PersistentStateScopeEvidence[];
  persistentStateLifetimes?: PersistentStateLifetimeEvidence[];
  repairTransformHints?: RepairSourceTransformHint[];
  arenaAuthorityEvidence?: ScriptArenaAuthorityEvidence[];
  arenaAuthorityPaths?: ScriptArenaAuthorityPath[];
  persistenceIdempotencyGuards?: ScriptPersistenceIdempotencyGuard[];
  safeConfigBindings?: ScriptSafeConfigBinding[];
  safeConfigFunctions?: ScriptSafeConfigFunction[];
  safeConfigImports?: ScriptSafeConfigImport[];
  safeConfigExports?: ScriptSafeConfigExport[];
  safeConfigRejected?: ScriptSafeConfigRejection[];
  capabilities: ScriptCapabilityUse[];
}
