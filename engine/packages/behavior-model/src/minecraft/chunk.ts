import {
  projectPolicyProvenance,
} from "../provenance.js";
import type {
  BehaviorModelFragment,
  BehaviorVariable,
} from "../types.js";

const provenance = projectPolicyProvenance(
  "behavior-spec:minecraft-chunk-v1",
  "Designed chunk residency abstraction; exact host semantics remain unproven.",
);

const VARIABLES: readonly BehaviorVariable[] = [
  {
    id: "chunk.loaded-for-script",
    scope: "chunk",
    valueType: "boolean",
    authority: "engine",
    provenance,
  },
  {
    id: "chunk.simulation-active",
    scope: "chunk",
    valueType: "boolean",
    authority: "engine",
    description:
      "Whether the project currently has evidence that gameplay simulation is active for this chunk; this is distinct from script-readable loaded state.",
    provenance,
  },
  {
    id: "chunk.generation",
    scope: "chunk",
    valueType: "number",
    authority: "derived",
    provenance,
  },
];

function condition(
  variableId: string,
  chunkKey: string,
  value: boolean,
) {
  return {
    kind: "condition" as const,
    condition: {
      variableId,
      scopeKey: chunkKey,
      operator: "eq" as const,
      value,
    },
  };
}

function loaded(
  chunkKey: string,
  value: boolean,
) {
  return condition(
    "chunk.loaded-for-script",
    chunkKey,
    value,
  );
}

export function createChunkResidencyBehavior(
  chunkKey: string,
): BehaviorModelFragment {
  const id = (suffix: string) =>
    "minecraft.chunk:" +
    chunkKey +
    ":" +
    suffix;

  return {
    variables: VARIABLES,
    transitions: [
      {
        id: id("load"),
        owner: "engine",
        preconditions: [
          loaded(chunkKey, false),
        ],
        effects: [
          {
            kind: "set",
            variableId:
              "chunk.loaded-for-script",
            scopeKey: chunkKey,
            value: true,
          },
          {
            kind: "increment",
            variableId: "chunk.generation",
            scopeKey: chunkKey,
            amount: 1,
          },
        ],
        nondeterminismSurfaces: [
          "chunk-residency",
          "tick-scheduling",
        ],
        provenance,
      },
      {
        id: id("activate-simulation"),
        owner: "engine",
        preconditions: [
          loaded(chunkKey, true),
          condition(
            "chunk.simulation-active",
            chunkKey,
            false,
          ),
        ],
        effects: [{
          kind: "set",
          variableId:
            "chunk.simulation-active",
          scopeKey: chunkKey,
          value: true,
        }],
        nondeterminismSurfaces: [
          "chunk-residency",
          "tick-scheduling",
        ],
        provenance,
      },
      {
        id: id("deactivate-simulation"),
        owner: "engine",
        preconditions: [
          condition(
            "chunk.simulation-active",
            chunkKey,
            true,
          ),
        ],
        effects: [{
          kind: "set",
          variableId:
            "chunk.simulation-active",
          scopeKey: chunkKey,
          value: false,
        }],
        nondeterminismSurfaces: [
          "chunk-residency",
          "tick-scheduling",
        ],
        provenance,
      },
      {
        id: id("unload"),
        owner: "engine",
        preconditions: [
          loaded(chunkKey, true),
        ],
        effects: [
          {
            kind: "set",
            variableId:
              "chunk.loaded-for-script",
            scopeKey: chunkKey,
            value: false,
          },
          {
            kind: "set",
            variableId:
              "chunk.simulation-active",
            scopeKey: chunkKey,
            value: false,
          },
          {
            kind: "increment",
            variableId: "chunk.generation",
            scopeKey: chunkKey,
            amount: 1,
          },
        ],
        nondeterminismSurfaces: [
          "chunk-residency",
          "tick-scheduling",
        ],
        provenance,
      },
    ],
    properties: [{
      id: id(
        "simulation-requires-loaded-state",
      ),
      kind: "always",
      predicate: {
        kind: "implies",
        if: condition(
          "chunk.simulation-active",
          chunkKey,
          true,
        ),
        then: loaded(chunkKey, true),
      },
      provenance,
    }],
  };
}
