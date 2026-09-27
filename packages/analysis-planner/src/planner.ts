import type {
  AnalysisCapability,
  AnalysisCostClass,
  AnalysisEvidenceLevel,
  AnalysisExecutionContext,
  AnalysisGoal,
  MinimumSufficientAnalysisInput,
  MinimumSufficientAnalysisPlan,
  PlannedAnalysisStep,
} from "./types.js";

const LEVEL_ORDER: Readonly<Record<
  AnalysisEvidenceLevel,
  number
>> = {
  metadata: 0,
  static: 1,
  semantic: 2,
  formal: 3,
  runtime: 4,
  intervention: 5,
};

const COST_ORDER: Readonly<Record<
  AnalysisCostClass,
  number
>> = {
  cheap: 0,
  moderate: 1,
  expensive: 2,
  "very-expensive": 3,
};

const GOAL_LEVEL: Readonly<Record<
  AnalysisGoal,
  AnalysisEvidenceLevel
>> = {
  "artifact-fact": "metadata",
  "structural-consistency": "static",
  "semantic-consistency": "semantic",
  "intent-classification": "semantic",
  "contradiction-proof": "formal",
  "runtime-evidence-integrity": "runtime",
  "runtime-behavior": "runtime",
  "causal-repair": "runtime",
};

function highestEvidenceLevel(
  input: MinimumSufficientAnalysisInput,
): AnalysisEvidenceLevel | undefined {
  const usable = (input.availableEvidence ?? [])
    .filter((item) => item.evidenceIds.length > 0)
    .map((item) => item.level)
    .sort((a, b) => LEVEL_ORDER[b] - LEVEL_ORDER[a]);

  return usable[0];
}

function contextCanReach(
  context: AnalysisExecutionContext,
  level: AnalysisEvidenceLevel,
): boolean {
  if (level === "runtime" || level === "intervention") {
    return (
      context === "LOCAL_MINECRAFT" ||
      context === "LIVE_MINECRAFT"
    );
  }
  return true;
}

function relevant(
  capability: AnalysisCapability,
  relevantTags: readonly string[],
): boolean {
  if (relevantTags.length === 0) return true;
  const wanted = new Set(relevantTags);
  return capability.tags.some((tag) => wanted.has(tag));
}

function candidateCapabilities(
  input: MinimumSufficientAnalysisInput,
  currentEvidenceLevel: AnalysisEvidenceLevel | undefined,
  requiredEvidenceLevel: AnalysisEvidenceLevel,
): AnalysisCapability[] {
  const currentOrder =
    currentEvidenceLevel === undefined
      ? -1
      : LEVEL_ORDER[currentEvidenceLevel];
  const requiredOrder =
    LEVEL_ORDER[requiredEvidenceLevel];

  return input.capabilities
    .filter((capability) => {
      const order =
        LEVEL_ORDER[capability.evidenceLevel];
      return (
        order > currentOrder &&
        order <= requiredOrder &&
        capability.contexts.includes(
          input.context,
        ) &&
        relevant(
          capability,
          input.relevantTags,
        )
      );
    })
    .sort(
      (a, b) =>
        LEVEL_ORDER[a.evidenceLevel] -
          LEVEL_ORDER[b.evidenceLevel] ||
        COST_ORDER[a.cost] -
          COST_ORDER[b.cost] ||
        Number(!a.deterministic) -
          Number(!b.deterministic) ||
        a.id.localeCompare(b.id),
    );
}

function prerequisiteChoice(
  capability: AnalysisCapability,
  input: MinimumSufficientAnalysisInput,
): {
  capability?: AnalysisCapability;
  error?: string;
} {
  const completed = new Set(
    input.completedCapabilityIds ?? [],
  );
  const byId = new Map(
    input.capabilities.map((item) => [
      item.id,
      item,
    ]),
  );
  const visiting = new Set<string>();

  const resolve = (
    item: AnalysisCapability,
  ): AnalysisCapability | undefined => {
    if (completed.has(item.id)) {
      return undefined;
    }

    if (visiting.has(item.id)) {
      throw new Error(
        "Analysis capability prerequisite cycle detected at " +
          item.id +
          ".",
      );
    }

    visiting.add(item.id);
    for (const prerequisiteId of [
      ...(item.prerequisites ?? []),
    ].sort()) {
      if (completed.has(prerequisiteId)) {
        continue;
      }
      const prerequisite =
        byId.get(prerequisiteId);
      if (!prerequisite) {
        throw new Error(
          "Analysis capability " +
            item.id +
            " references missing prerequisite " +
            prerequisiteId +
            ".",
        );
      }
      if (
        !prerequisite.contexts.includes(
          input.context,
        )
      ) {
        throw new Error(
          "Analysis capability prerequisite " +
            prerequisiteId +
            " is unavailable in execution context " +
            input.context +
            ".",
        );
      }
      const nested = resolve(prerequisite);
      if (nested) {
        visiting.delete(item.id);
        return nested;
      }
      if (!completed.has(prerequisiteId)) {
        visiting.delete(item.id);
        return prerequisite;
      }
    }
    visiting.delete(item.id);
    return item;
  };

  try {
    const resolved = resolve(capability);
    return resolved === undefined
      ? {}
      : { capability: resolved };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Analysis prerequisite resolution failed.",
    };
  }
}

export function requiredEvidenceLevelForGoal(
  goal: AnalysisGoal,
): AnalysisEvidenceLevel {
  return GOAL_LEVEL[goal];
}

export function planMinimumSufficientAnalysis(
  input: MinimumSufficientAnalysisInput,
): MinimumSufficientAnalysisPlan {
  const requiredEvidenceLevel =
    requiredEvidenceLevelForGoal(input.goal);
  const currentEvidenceLevel =
    highestEvidenceLevel(input);

  if (
    currentEvidenceLevel !== undefined &&
    LEVEL_ORDER[currentEvidenceLevel] >=
      LEVEL_ORDER[requiredEvidenceLevel]
  ) {
    return {
      goal: input.goal,
      requiredEvidenceLevel,
      currentEvidenceLevel,
      disposition: "stop-sufficient",
      steps: [],
      skippedCapabilityIds:
        input.capabilities.map((item) => item.id).sort(),
      reasons: [
        "Existing evidence already meets or exceeds the minimum evidence level required for this analysis goal.",
        "No additional analysis should run unless the existing evidence is stale, contradictory, or target-mismatched.",
      ],
    };
  }

  if (
    !contextCanReach(
      input.context,
      requiredEvidenceLevel,
    )
  ) {
    return {
      goal: input.goal,
      requiredEvidenceLevel,
      ...(currentEvidenceLevel === undefined
        ? {}
        : { currentEvidenceLevel }),
      disposition: "requires-runtime-context",
      steps: [],
      skippedCapabilityIds:
        input.capabilities.map((item) => item.id).sort(),
      reasons: [
        "The requested analysis goal requires runtime evidence, but the current execution context cannot produce it.",
      ],
    };
  }

  const candidates = candidateCapabilities(
    input,
    currentEvidenceLevel,
    requiredEvidenceLevel,
  );

  if (candidates.length === 0) {
    return {
      goal: input.goal,
      requiredEvidenceLevel,
      ...(currentEvidenceLevel === undefined
        ? {}
        : { currentEvidenceLevel }),
      disposition: "capability-gap",
      steps: [],
      skippedCapabilityIds:
        input.capabilities.map((item) => item.id).sort(),
      reasons: [
        "No relevant capability available in the current context can advance evidence toward the minimum level required for this analysis goal.",
      ],
    };
  }

  const resolved = prerequisiteChoice(
    candidates[0]!,
    input,
  );

  if (!resolved.capability) {
    return {
      goal: input.goal,
      requiredEvidenceLevel,
      ...(currentEvidenceLevel === undefined
        ? {}
        : { currentEvidenceLevel }),
      disposition: "capability-gap",
      steps: [],
      skippedCapabilityIds:
        input.capabilities.map((item) => item.id).sort(),
      reasons: [
        resolved.error ??
          "No executable analysis capability could be resolved.",
      ],
    };
  }

  const selected = resolved.capability;
  const step: PlannedAnalysisStep = {
    capabilityId: selected.id,
    evidenceLevel: selected.evidenceLevel,
    cost: selected.cost,
    reasons: [
      "Selected as the next lowest-cost relevant evidence escalation.",
      ...(selected.deterministic
        ? ["Deterministic capability preferred."]
        : []),
      ...(selected.id === candidates[0]!.id
        ? []
        : [
            "Selected because it is an unmet prerequisite of the next analysis capability.",
          ]),
    ],
  };

  return {
    goal: input.goal,
    requiredEvidenceLevel,
    ...(currentEvidenceLevel === undefined
      ? {}
      : { currentEvidenceLevel }),
    disposition: "execute",
    steps: [step],
    skippedCapabilityIds: input.capabilities
      .map((item) => item.id)
      .filter((id) => id !== selected.id)
      .sort(),
    reasons: [
      "Only one next-best analysis action is scheduled.",
      "Re-plan after this step so newly collected evidence can stop escalation before more expensive analysis runs.",
      "The repair authority remains outside the analysis planner; reaching the evidence level does not authorize mutation.",
    ],
  };
}
