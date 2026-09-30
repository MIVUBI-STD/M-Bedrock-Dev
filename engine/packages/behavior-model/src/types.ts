import type {
  BehaviorClaimProvenance,
} from "./provenance.js";

export type BehaviorScalar =
  | string
  | number
  | boolean
  | null;

export type BehaviorScopeKind =
  | "world"
  | "dimension"
  | "chunk"
  | "arena"
  | "player"
  | "entity"
  | "subsystem";

export interface BehaviorVariable {
  id: string;
  scope: BehaviorScopeKind;
  valueType: "string" | "number" | "boolean" | "nullable";
  authority: "engine" | "script" | "command" | "derived" | "unknown";
  description?: string;
  provenance?: BehaviorClaimProvenance;
}

export interface BehaviorState {
  schemaVersion: 1;
  tick: number;
  values: Readonly<Record<string, BehaviorScalar>>;
}

export type BehaviorComparisonOperator =
  | "eq"
  | "neq"
  | "exists"
  | "missing"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export interface BehaviorCondition {
  variableId: string;
  scopeKey?: string;
  operator: BehaviorComparisonOperator;
  value?: BehaviorScalar;
}

export type BehaviorPredicate =
  | {
      kind: "condition";
      condition: BehaviorCondition;
    }
  | {
      kind: "all";
      predicates: readonly BehaviorPredicate[];
    }
  | {
      kind: "any";
      predicates: readonly BehaviorPredicate[];
    }
  | {
      kind: "not";
      predicate: BehaviorPredicate;
    }
  | {
      kind: "implies";
      if: BehaviorPredicate;
      then: BehaviorPredicate;
    };

export type BehaviorEffect =
  | {
      kind: "set";
      variableId: string;
      scopeKey?: string;
      value: BehaviorScalar;
    }
  | {
      kind: "delete";
      variableId: string;
      scopeKey?: string;
    }
  | {
      kind: "increment";
      variableId: string;
      scopeKey?: string;
      amount: number;
    };

export type BehaviorTransitionOwner =
  | "engine"
  | "script"
  | "command"
  | "player"
  | "environment";

export type NondeterminismSurface =
  | "tick-scheduling"
  | "event-ordering"
  | "deferred-callback-order"
  | "entity-tick-order"
  | "chunk-residency"
  | "ai-goal-arbitration"
  | "pathfinding"
  | "network-input-order"
  | "death-respawn-order"
  | "command-order"
  | "scoreboard-visibility"
  | "script-event-delivery"
  | "structure-load-order"
  | "dimension-transition"
  | "world-persistence"
  | "unknown";

export interface BehaviorTransition {
  id: string;
  owner: BehaviorTransitionOwner;
  preconditions: readonly BehaviorPredicate[];
  effects: readonly BehaviorEffect[];
  nondeterminismSurfaces?: readonly NondeterminismSurface[];
  description?: string;
  provenance?: BehaviorClaimProvenance;
}

export type TemporalProperty =
  | {
      id: string;
      kind: "always";
      predicate: BehaviorPredicate;
      description?: string;
      provenance?: BehaviorClaimProvenance;
    }
  | {
      id: string;
      kind: "eventually";
      predicate: BehaviorPredicate;
      withinTicks?: number;
      description?: string;
      provenance?: BehaviorClaimProvenance;
    }
  | {
      id: string;
      kind: "leads-to";
      trigger: BehaviorPredicate;
      consequence: BehaviorPredicate;
      withinTicks?: number;
      description?: string;
      provenance?: BehaviorClaimProvenance;
    }
  | {
      id: string;
      kind: "until";
      hold: BehaviorPredicate;
      until: BehaviorPredicate;
      withinTicks?: number;
      description?: string;
      provenance?: BehaviorClaimProvenance;
    };

export interface BehaviorModelFragment {
  variables?: readonly BehaviorVariable[];
  transitions?: readonly BehaviorTransition[];
  properties?: readonly TemporalProperty[];
}

export interface BehavioralWorldModel {
  schemaVersion: 1;
  id: string;
  variables: readonly BehaviorVariable[];
  transitions: readonly BehaviorTransition[];
  properties: readonly TemporalProperty[];
}

export interface BehaviorTrace {
  schemaVersion: 1;
  states: readonly BehaviorState[];
  complete: boolean;
}

export type PropertyDisposition =
  | "satisfied"
  | "violated"
  | "unknown";

export interface PropertyEvaluation {
  propertyId: string;
  disposition: PropertyDisposition;
  witnessTicks: readonly number[];
  reason: string;
}
