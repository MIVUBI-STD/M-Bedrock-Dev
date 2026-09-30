import {
  projectPolicyProvenance,
} from "../provenance.js";
import type {
  BehaviorModelFragment,
  BehaviorPredicate,
  BehaviorVariable,
} from "../types.js";

const provenance = projectPolicyProvenance(
  "behavior-spec:minecraft-reward-lifecycle-v1",
  "Designed logical reward lifecycle. Physical item delivery, currency credit, and terminal reward commit remain separate stages until verified.",
);

const VARIABLES: readonly BehaviorVariable[] = [
  {
    id: "reward.phase",
    scope: "subsystem",
    valueType: "string",
    authority: "script",
    description:
      "Logical reward transaction phase.",
    provenance,
  },
  {
    id: "reward.generation-current",
    scope: "subsystem",
    valueType: "boolean",
    authority: "derived",
    description:
      "Whether the reward belongs to the current arena/round/session generation.",
    provenance,
  },
  {
    id: "reward.claimable",
    scope: "subsystem",
    valueType: "boolean",
    authority: "script",
    description:
      "Whether this logical reward may still be claimed.",
    provenance,
  },
  {
    id: "reward.delivery-verified",
    scope: "subsystem",
    valueType: "boolean",
    authority: "derived",
    description:
      "Whether physical or logical delivery was verified according to policy.",
    provenance,
  },
  {
    id: "reward.committed",
    scope: "subsystem",
    valueType: "boolean",
    authority: "script",
    description:
      "Whether durable currency/progression/result credit was committed.",
    provenance,
  },
];

function eq(
  variableId: string,
  scopeKey: string,
  value: string | number | boolean | null,
): BehaviorPredicate {
  return {
    kind: "condition",
    condition: {
      variableId,
      scopeKey,
      operator: "eq",
      value,
    },
  };
}

export interface RewardLifecycleBehaviorOptions {
  rewardKey: string;
  commitDeadlineTicks?: number;
}

export function createRewardLifecycleBehavior(
  options: RewardLifecycleBehaviorOptions,
): BehaviorModelFragment {
  const r = options.rewardKey;
  const id = (suffix: string) =>
    "minecraft.reward:" + r + ":" + suffix;

  return {
    variables: VARIABLES,
    transitions: [
      {
        id: id("reserve"),
        owner: "script",
        preconditions: [
          eq("reward.phase", r, "pending"),
          eq(
            "reward.generation-current",
            r,
            true,
          ),
          eq("reward.claimable", r, true),
        ],
        effects: [{
          kind: "set",
          variableId: "reward.phase",
          scopeKey: r,
          value: "reserved",
        }],
        nondeterminismSurfaces: [
          "event-ordering",
          "network-input-order",
        ],
        provenance,
      },
      {
        id: id("deliver"),
        owner: "script",
        preconditions: [
          eq("reward.phase", r, "reserved"),
          eq(
            "reward.generation-current",
            r,
            true,
          ),
        ],
        effects: [{
          kind: "set",
          variableId: "reward.phase",
          scopeKey: r,
          value: "delivered",
        }],
        provenance,
      },
      {
        id: id("verify"),
        owner: "script",
        preconditions: [
          eq("reward.phase", r, "delivered"),
        ],
        effects: [
          {
            kind: "set",
            variableId:
              "reward.delivery-verified",
            scopeKey: r,
            value: true,
          },
          {
            kind: "set",
            variableId: "reward.phase",
            scopeKey: r,
            value: "verified",
          },
        ],
        provenance,
      },
      {
        id: id("commit"),
        owner: "script",
        preconditions: [
          eq("reward.phase", r, "verified"),
          eq(
            "reward.delivery-verified",
            r,
            true,
          ),
          eq(
            "reward.generation-current",
            r,
            true,
          ),
          eq("reward.committed", r, false),
        ],
        effects: [
          {
            kind: "set",
            variableId: "reward.committed",
            scopeKey: r,
            value: true,
          },
          {
            kind: "set",
            variableId: "reward.claimable",
            scopeKey: r,
            value: false,
          },
          {
            kind: "set",
            variableId: "reward.phase",
            scopeKey: r,
            value: "committed",
          },
        ],
        provenance,
      },
      {
        id: id("invalidate-generation"),
        owner: "script",
        preconditions: [
          eq(
            "reward.generation-current",
            r,
            true,
          ),
        ],
        effects: [
          {
            kind: "set",
            variableId:
              "reward.generation-current",
            scopeKey: r,
            value: false,
          },
          {
            kind: "set",
            variableId: "reward.claimable",
            scopeKey: r,
            value: false,
          },
          {
            kind: "set",
            variableId: "reward.phase",
            scopeKey: r,
            value: "invalidated",
          },
        ],
        provenance,
      },
    ],
    properties: [
      {
        id: id("commit-requires-verification"),
        kind: "always",
        predicate: {
          kind: "implies",
          if: eq(
            "reward.committed",
            r,
            true,
          ),
          then: eq(
            "reward.delivery-verified",
            r,
            true,
          ),
        },
        provenance,
      },
      {
        id: id("invalidated-not-claimable"),
        kind: "always",
        predicate: {
          kind: "implies",
          if: eq(
            "reward.phase",
            r,
            "invalidated",
          ),
          then: eq(
            "reward.claimable",
            r,
            false,
          ),
        },
        provenance,
      },
      {
        id: id("reserved-eventually-resolves"),
        kind: "leads-to",
        trigger: eq(
          "reward.phase",
          r,
          "reserved",
        ),
        consequence: {
          kind: "any",
          predicates: [
            eq(
              "reward.phase",
              r,
              "committed",
            ),
            eq(
              "reward.phase",
              r,
              "invalidated",
            ),
          ],
        },
        ...(options.commitDeadlineTicks ===
        undefined
          ? {}
          : {
              withinTicks:
                options.commitDeadlineTicks,
            }),
        provenance,
      },
    ],
  };
}
