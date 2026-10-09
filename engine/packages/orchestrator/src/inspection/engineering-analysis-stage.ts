import {
  buildEngineeringAnalysis,
  evaluateUpperBoundConstraint,
  type EngineeringAnalysis,
  type EngineeringEvidenceChannel,
  type QuantitativeConstraint,
  type RepairAlternative,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  ArenaCapacityExtractionResult,
} from "../arena/arena-capacity-extraction.js";
import type {
  GameplayWorldModel,
} from "./gameplay-world-model.js";

export interface InspectionEngineeringAnalysis {
  readonly id: string;
  readonly domain:
    | "arena-capacity"
    | "generic";
  readonly analysis: EngineeringAnalysis;
}

function arenaCapacityAnalysis(
  world: GameplayWorldModel,
  capacity:
    ArenaCapacityExtractionResult | undefined,
  target: {
    readonly edition?: string;
    readonly version?: string;
  },
): InspectionEngineeringAnalysis | undefined {
  const visible = world.arenas.count;
  const safe =
    world.arenas.safeConcurrentArenas;

  if (
    visible === undefined ||
    safe === undefined ||
    safe === null ||
    safe >= visible
  ) {
    return undefined;
  }

  const declaredCap =
    world.arenas.declaredConcurrentArenaLimit;
  const limitingIds =
    capacity?.report?.limitingResourceIds ??
    [];

  const evidenceChannels:
    EngineeringEvidenceChannel[] = [{
      channel: "world",
      evidenceIds: ["world:arena-count"],
      statement:
        String(visible) +
        " distinct arena instances are detected in the selected artifact.",
    }];

  if (declaredCap !== undefined) {
    evidenceChannels.push({
      channel: "source",
      evidenceIds: [
        "source:arena-concurrency-cap",
      ],
      statement:
        "Runtime admission explicitly limits active arenas to " +
        String(declaredCap) +
        ".",
    });
  }

  if (limitingIds.length > 0) {
    evidenceChannels.push({
      channel: "platform",
      evidenceIds:
        limitingIds.map(
          (id) => "capacity:" + id,
        ),
      statement:
        "Declared runtime resources limit safe simultaneous arena capacity to " +
        String(safe) +
        ".",
    });
  }

  const constraints:
    QuantitativeConstraint[] = [
      evaluateUpperBoundConstraint({
        id: "arena-concurrency",
        expression:
          "available arena instances must fit safe simultaneous runtime capacity",
        observedValue: visible,
        limitValue: safe,
        unit: "arenas",
        evidenceIds: [
          "world:arena-count",
          ...limitingIds.map(
            (id) => "capacity:" + id,
          ),
        ],
      }),
    ];

  const alternatives: RepairAlternative[] = [];

  if (
    limitingIds.includes(
      "runtime-arena-admission-cap",
    )
  ) {
    alternatives.push({
      id: "raise-admission-cap",
      summary:
        "Raise the arena admission cap only after proving the underlying shared runtime resources can support the target arena count.",
      resolves: [
        "artificial admission bottleneck",
      ],
      introduces: [
        "higher shared-resource demand",
      ],
      validation: [
        "Run the target number of arenas simultaneously.",
      ],
    });
  }

  if (
    limitingIds.includes(
      "command-tickingarea-slots",
    )
  ) {
    alternatives.push({
      id: "reduce-residency-cost",
      summary:
        "Reduce per-arena ticking-area cost or activate only gameplay-critical NPC/path regions instead of reserving broad static coverage.",
      resolves: [
        "ticking-area slot pressure",
        "multi-arena concurrency shortfall",
      ],
      validation: [
        "Verify NPC/wave progression while players remain at their normal gameplay positions.",
        "Verify simultaneous arenas do not lose chunk-dependent actors or objectives.",
      ],
    });
  }

  if (
    capacity?.evidence
      .scriptTickingAreaManagerReferenced &&
    !capacity.evidence
      .scriptTickingAreaCapacityResolved
  ) {
    alternatives.push({
      id: "runtime-residency-validation",
      summary:
        "Resolve or runtime-test the script-managed residency backend before increasing concurrency.",
      resolves: [
        "unknown residency capacity",
      ],
      validation: [
        "Validate on the exact target Minecraft edition/version.",
      ],
    });
  }

  if (alternatives.length === 0) {
    alternatives.push({
      id: "decouple-shared-resource",
      summary:
        "Remove or repartition the shared resource that caps otherwise independent arena sessions.",
      resolves: [
        "global concurrency bottleneck",
      ],
      validation: [
        "Verify all exposed arenas can start and complete independently.",
      ],
    });
  }

  const verification = [
    "Start " +
      String(Math.min(visible, safe + 1)) +
      " independent arena sessions and confirm the session beyond the current safe limit can actually start.",
    "Start all " +
      String(visible) +
      " arena sessions concurrently.",
    "Verify progression, enemies/objectives, scoring, cleanup, and second-run reuse remain isolated across arenas.",
  ];

  if (
    limitingIds.includes(
      "command-tickingarea-slots",
    ) ||
    capacity?.evidence
      .scriptTickingAreaManagerReferenced
  ) {
    verification.push(
      "Keep players at normal base/objective positions and confirm distant NPC/wave logic continues without requiring a nearby player.",
    );
  }

  const targetNote =
    target.edition === undefined
      ? undefined
      : "Target edition: " +
        target.edition +
        (target.version
          ? " " + target.version
          : "");

  if (targetNote) {
    evidenceChannels.push({
      channel: "platform",
      evidenceIds: [
        "target:edition-version",
      ],
      statement: targetNote + ".",
    });
  }

  return {
    id: "engineering:arena-capacity",
    domain: "arena-capacity",
    analysis: buildEngineeringAnalysis({
      symptom:
        "Only " +
        String(safe) +
        " of " +
        String(visible) +
        " detected arenas are safely admitted concurrently.",
      immediateCause:
        declaredCap !== undefined
          ? "Runtime admission is capped at " +
            String(declaredCap) +
            " active arena(s)."
          : "A shared runtime resource limits safe concurrent arenas to " +
            String(safe) +
            ".",
      rootCause:
        "Arena availability and shared runtime-resource capacity are not aligned.",
      gameplayConsequence:
        "Players assigned beyond the safe concurrent capacity cannot begin an otherwise available independent arena session at the same time.",
      designContradiction:
        "The selected world exposes " +
        String(visible) +
        " arena instances, while the runtime safely supports only " +
        String(safe) +
        " concurrent session(s).",
      evidenceChannels,
      constraints,
      alternatives,
      verification,
    }),
  };
}

export function deriveInspectionEngineeringAnalyses(
  input: {
    readonly world: GameplayWorldModel;
    readonly arenaCapacity?:
      ArenaCapacityExtractionResult;
    readonly target: {
      readonly edition?: string;
      readonly version?: string;
    };
  },
): readonly InspectionEngineeringAnalysis[] {
  const analyses: InspectionEngineeringAnalysis[] =
    [];

  const arena = arenaCapacityAnalysis(
    input.world,
    input.arenaCapacity,
    input.target,
  );
  if (arena) analyses.push(arena);

  return analyses;
}
