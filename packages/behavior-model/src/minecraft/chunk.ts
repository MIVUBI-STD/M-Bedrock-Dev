import type {
  BehaviorModelFragment,
  BehaviorVariable,
} from "../types.js";

const VARIABLES: readonly BehaviorVariable[] = [
  {
    id: "chunk.loaded-for-script",
    scope: "chunk",
    valueType: "boolean",
    authority: "engine",
  },
  {
    id: "chunk.generation",
    scope: "chunk",
    valueType: "number",
    authority: "derived",
  },
];

function loaded(chunkKey: string, value: boolean) {
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
    "minecraft.chunk:" + chunkKey + ":" + suffix;

  return {
    variables: VARIABLES,
    transitions: [
      {
        id: id("load"),
        owner: "engine",
        preconditions: [loaded(chunkKey, false)],
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
      },
      {
        id: id("unload"),
        owner: "engine",
        preconditions: [loaded(chunkKey, true)],
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
      },
    ],
  };
}
