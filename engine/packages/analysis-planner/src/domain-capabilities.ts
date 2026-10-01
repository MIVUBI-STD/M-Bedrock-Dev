import type {
  AnalysisCapability,
} from "./types.js";

export const DOMAIN_ANALYSIS_CAPABILITIES:
  readonly AnalysisCapability[] = [
    {
      id: "script-dataflow-lineage",
      evidenceLevel: "semantic",
      cost: "moderate",
      tags: [
        "script",
        "dataflow",
        "taint",
        "identity",
        "state",
        "lineage",
      ],
      deterministic: true,
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
        "LOCAL_MINECRAFT",
        "LIVE_MINECRAFT",
      ],
      producesTraits: [
        "semantic-model",
      ],
    },
    {
      id: "script-semantic-flow",
      evidenceLevel: "semantic",
      cost: "moderate",
      tags: ["script","dataflow","taint","identity","reward","state","world-mutation"],
      deterministic: true,
      contexts: ["REMOTE_GITHUB","LOCAL_ARTIFACT","LOCAL_MINECRAFT","LIVE_MINECRAFT"],
      producesTraits: ["semantic-model"],
      prerequisites: ["script-dataflow-lineage"],
    },
    {
      id: "script-source-recovery",
      evidenceLevel: "static",
      cost: "cheap",
      tags: ["script","bundle","minified","source-map","source-recovery"],
      deterministic: true,
      contexts: ["REMOTE_GITHUB","LOCAL_ARTIFACT","LOCAL_MINECRAFT","LIVE_MINECRAFT"],
      producesTraits: ["structural-proof"],
    },
    {
      id: "arena-lifecycle-integrity",
      evidenceLevel: "semantic",
      cost: "cheap",
      tags: [
        "arena",
        "lifecycle",
        "cleanup",
        "generation",
      ],
      deterministic: true,
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
        "LOCAL_MINECRAFT",
        "LIVE_MINECRAFT",
      ],
      producesTraits: [
        "structural-proof",
        "semantic-model",
      ],
    },
    {
      id: "spatial-authority-coverage",
      evidenceLevel: "semantic",
      cost: "cheap",
      tags: [
        "spatial",
        "authority",
        "permission",
        "region",
        "build",
      ],
      deterministic: true,
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
        "LOCAL_MINECRAFT",
        "LIVE_MINECRAFT",
      ],
      producesTraits: [
        "semantic-model",
      ],
    },
    {
      id: "inventory-lifecycle-integrity",
      evidenceLevel: "semantic",
      cost: "moderate",
      tags: [
        "inventory",
        "equipment",
        "loadout",
        "respawn",
        "item",
      ],
      deterministic: true,
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
        "LOCAL_MINECRAFT",
        "LIVE_MINECRAFT",
      ],
      producesTraits: [
        "structural-proof",
        "semantic-model",
      ],
    },
    {
      id: "entity-ai-navigation-readiness",
      evidenceLevel: "semantic",
      cost: "moderate",
      tags: [
        "entity",
        "ai",
        "navigation",
        "pathfinding",
        "route",
      ],
      deterministic: true,
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
        "LOCAL_MINECRAFT",
        "LIVE_MINECRAFT",
      ],
      producesTraits: [
        "structural-proof",
        "semantic-model",
      ],
    },
    {
      id: "combat-lifecycle-policy",
      evidenceLevel: "semantic",
      cost: "moderate",
      tags: [
        "combat",
        "damage",
        "revive",
        "death",
        "projectile",
      ],
      deterministic: true,
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
        "LOCAL_MINECRAFT",
        "LIVE_MINECRAFT",
      ],
      producesTraits: [
        "semantic-model",
      ],
    },
    {
      id: "chunk-lifecycle-integrity",
      evidenceLevel: "semantic",
      cost: "moderate",
      tags: [
        "chunk",
        "readiness",
        "ticking-area",
        "residency",
        "lifecycle",
      ],
      deterministic: true,
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
        "LOCAL_MINECRAFT",
        "LIVE_MINECRAFT",
      ],
      producesTraits: [
        "structural-proof",
        "semantic-model",
      ],
    },
    {
      id: "economy-reward-integrity",
      evidenceLevel: "semantic",
      cost: "moderate",
      tags: [
        "economy",
        "reward",
        "currency",
        "loot",
        "progression",
      ],
      deterministic: true,
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
        "LOCAL_MINECRAFT",
        "LIVE_MINECRAFT",
      ],
      producesTraits: [
        "semantic-model",
      ],
    },
    {
      id: "persistence-lifecycle-integrity",
      evidenceLevel: "semantic",
      cost: "moderate",
      tags: [
        "persistence",
        "dynamic-property",
        "recovery",
        "state",
      ],
      deterministic: true,
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
        "LOCAL_MINECRAFT",
        "LIVE_MINECRAFT",
      ],
      producesTraits: [
        "semantic-model",
      ],
    },
    {
      id: "multiplayer-interleaving",
      evidenceLevel: "semantic",
      cost: "moderate",
      tags: [
        "multiplayer",
        "race",
        "interleaving",
        "generation",
        "arena",
      ],
      deterministic: true,
      contexts: [
        "REMOTE_GITHUB",
        "LOCAL_ARTIFACT",
        "LOCAL_MINECRAFT",
        "LIVE_MINECRAFT",
      ],
      producesTraits: [
        "semantic-model",
      ],
    },
    {
      id: "persistence-recovery-runtime",
      evidenceLevel: "runtime",
      cost: "expensive",
      tags: [
        "persistence",
        "recovery",
        "reload",
        "runtime",
      ],
      deterministic: false,
      contexts: [
        "LOCAL_MINECRAFT",
        "LIVE_MINECRAFT",
      ],
      producesTraits: [
        "runtime-observation",
      ],
      prerequisites: [
        "persistence-lifecycle-integrity",
      ],
    },
    {
      id: "entity-ai-navigation-runtime",
      evidenceLevel: "runtime",
      cost: "very-expensive",
      tags: [
        "entity",
        "ai",
        "navigation",
        "pathfinding",
        "crowding",
        "recovery",
      ],
      deterministic: false,
      contexts: [
        "LOCAL_MINECRAFT",
        "LIVE_MINECRAFT",
      ],
      producesTraits: [
        "runtime-observation",
      ],
      prerequisites: [
        "entity-ai-navigation-readiness",
      ],
    },
    {
      id: "chunk-readiness-runtime",
      evidenceLevel: "runtime",
      cost: "very-expensive",
      tags: [
        "chunk",
        "readiness",
        "loader",
        "ticking-area",
        "runtime",
      ],
      deterministic: false,
      contexts: [
        "LOCAL_MINECRAFT",
        "LIVE_MINECRAFT",
      ],
      producesTraits: [
        "runtime-observation",
      ],
      prerequisites: [
        "chunk-lifecycle-integrity",
      ],
    },
    {
      id: "combat-revive-runtime",
      evidenceLevel: "runtime",
      cost: "expensive",
      tags: [
        "combat",
        "revive",
        "death",
        "runtime",
      ],
      deterministic: false,
      contexts: [
        "LOCAL_MINECRAFT",
        "LIVE_MINECRAFT",
      ],
      producesTraits: [
        "runtime-observation",
      ],
      prerequisites: [
        "combat-lifecycle-policy",
      ],
    },
  ] as const;
