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
    id: "chunk.generation",
    scope: "chunk",
    valueType: "number",
    authority: "derived",
    provenance,
  },
];

function loaded(
  chunkKey: string,
  value: boolean,
) {
  return {
    kind: "condition" as const,
    condition: {
      variableId: "chunk.loaded-for-script",
      scopeKey: chunkKey,
      operator: "eq" as const,
      value,
    },
  };
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
  };
}
