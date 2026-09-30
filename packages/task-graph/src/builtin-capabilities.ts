import type {
  TaskCapability,
} from "./types.js";

export const BUILTIN_TASK_CAPABILITIES:
  readonly TaskCapability[] = [
    {
      id: "source.scripts",
      owner: "analyzers/scripts",
      pathPrefixes: [
        "analyzers/scripts/src",
      ],
      deterministic: true,
      cacheable: true,
      cost: "moderate",
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
      ],
    },
    {
      id: "source.entities",
      owner: "analyzers/entities",
      pathPrefixes: [
        "analyzers/entities/src",
      ],
      deterministic: true,
      cacheable: true,
      cost: "moderate",
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
      ],
    },
    {
      id: "behavior.contracts",
      owner: "packages/behavior-model",
      pathPrefixes: [
        "packages/behavior-model/src",
      ],
      deterministic: true,
      cacheable: true,
      cost: "cheap",
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
      ],
    },
    {
      id: "domain.arena-lifecycle",
      owner: "packages/orchestrator",
      pathPrefixes: [
        "packages/orchestrator/src/arena-lifecycle-*",
        "packages/orchestrator/src/arena-cleanup-*",
      ],
      dependsOn: [
        "source.scripts",
        "behavior.contracts",
      ],
      deterministic: true,
      cacheable: true,
      cost: "moderate",
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
      ],
    },
    {
      id: "domain.spatial-authority",
      owner: "packages/orchestrator",
      pathPrefixes: [
        "packages/orchestrator/src/spatial-authority-*",
      ],
      dependsOn: [
        "behavior.contracts",
      ],
      deterministic: true,
      cacheable: true,
      cost: "moderate",
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
      ],
    },
    {
      id: "domain.inventory",
      owner: "packages/orchestrator",
      pathPrefixes: [
        "packages/orchestrator/src/inventory-*",
      ],
      dependsOn: [
        "source.scripts",
        "behavior.contracts",
      ],
      deterministic: true,
      cacheable: true,
      cost: "moderate",
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
      ],
    },
    {
      id: "domain.entity-ai",
      owner: "packages/orchestrator",
      pathPrefixes: [
        "packages/orchestrator/src/entity-ai-*",
        "packages/orchestrator/src/entity-navigation-*",
        "packages/orchestrator/src/route-navigation-*",
      ],
      dependsOn: [
        "source.entities",
        "behavior.contracts",
      ],
      deterministic: true,
      cacheable: true,
      cost: "moderate",
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
      ],
    },
    {
      id: "domain.combat",
      owner: "packages/orchestrator",
      pathPrefixes: [
        "packages/orchestrator/src/combat-*",
      ],
      dependsOn: [
        "source.scripts",
        "behavior.contracts",
      ],
      deterministic: true,
      cacheable: true,
      cost: "moderate",
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
      ],
    },
    {
      id: "domain.chunks",
      owner: "packages/orchestrator",
      pathPrefixes: [
        "packages/orchestrator/src/chunk-*",
      ],
      dependsOn: [
        "source.scripts",
        "behavior.contracts",
      ],
      deterministic: true,
      cacheable: true,
      cost: "moderate",
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
      ],
    },
    {
      id: "domain.economy",
      owner: "packages/orchestrator",
      pathPrefixes: [
        "packages/orchestrator/src/economy-*",
        "packages/orchestrator/src/reward-source-*",
      ],
      dependsOn: [
        "source.scripts",
        "source.entities",
        "behavior.contracts",
      ],
      deterministic: true,
      cacheable: true,
      cost: "moderate",
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
      ],
    },
    {
      id: "projection.world-model",
      owner: "packages/orchestrator",
      pathPrefixes: [
        "packages/orchestrator/src/gameplay-world-model.ts",
      ],
      dependsOn: [
        "domain.arena-lifecycle",
        "domain.spatial-authority",
        "domain.inventory",
        "domain.entity-ai",
        "domain.combat",
        "domain.chunks",
        "domain.economy",
      ],
      deterministic: true,
      cacheable: true,
      cost: "cheap",
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
      ],
    },
    {
      id: "projection.workflow",
      owner: "packages/orchestrator",
      pathPrefixes: [
        "packages/orchestrator/src/map-engineering-workflow.ts",
      ],
      dependsOn: [
        "projection.world-model",
      ],
      deterministic: true,
      cacheable: true,
      cost: "cheap",
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
      ],
    },
    {
      id: "repair.routing",
      owner: "packages/orchestrator",
      pathPrefixes: [
        "packages/orchestrator/src/repair-strategy-*",
        "packages/orchestrator/src/repair-realiz*",
      ],
      dependsOn: [
        "projection.world-model",
      ],
      deterministic: true,
      cacheable: true,
      cost: "cheap",
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
      ],
    },
    {
      id: "context.compile",
      owner: "packages/orchestrator",
      pathPrefixes: [
        "packages/orchestrator/src/context-compiler.ts",
      ],
      dependsOn: [
        "projection.world-model",
      ],
      deterministic: true,
      cacheable: true,
      cost: "cheap",
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
      ],
    },
  ] as const;
