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
  "runtime-behavior": "runtime",
  "causal-repair": "intervention",
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

function chooseCheapestForLevel(
  capabilities: readonly AnalysisCapability[],
  level: AnalysisEvidenceLevel,
  context: AnalysisExecutionContext,
  relevantTags: readonly string[],
): AnalysisCapability | undefined {
  return capabilities
    .filter(
      (capability) =>
        capability.evidenceLevel === level &&
        capability.contexts.includes(context) &&
        relevant(capability, relevantTags),
    )
    .sort(
      (a, b) =>
        COST_ORDER[a.cost] - COST_ORDER[b.cost] ||
        Number(!a.deterministic) -
          Number(!b.deterministic) ||
        a.id.localeCompare(b.id),
    )[0];
}

function levelsBetween(
  current: AnalysisEvidenceLevel | undefined,
  required: AnalysisEvidenceLevel,
): AnalysisEvidenceLevel[] {
  const from =
    current === undefined
      ? 0
      : LEVEL_ORDER[current] + 1;
  const to = LEVEL_ORDER[required];

  return (
    Object.keys(LEVEL_ORDER) as AnalysisEvidenceLevel[]
  )
    .filter((level) => {
      const order = LEVEL_ORDER[level];
      return order >= from && order <= to;
    })
    .sort((a, b) => LEVEL_ORDER[a] - LEVEL_ORDER[b]);
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
        "The requested analysis goal requires runtime or intervention evidence, but the current execution context cannot produce it.",
      ],
    };
  }

  const selected: AnalysisCapability[] = [];

  for (const level of levelsBetween(
    currentEvidenceLevel,
    requiredEvidenceLevel,
  )) {
    const choice = chooseCheapestForLevel(
      input.capabilities,
      level,
      input.context,
      input.relevantTags,
    );
    if (!choice) continue;
    selected.push(choice);
  }

  const canReachRequired = selected.some(
    (item) =>
      LEVEL_ORDER[item.evidenceLevel] >=
      LEVEL_ORDER[requiredEvidenceLevel],
  );

  if (!canReachRequired) {
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
        "No relevant capability available in the current context can reach the minimum evidence level required for this analysis goal.",
      ],
    };
  }

  const selectedIds = new Set(
    selected.map((item) => item.id),
  );

  const steps: PlannedAnalysisStep[] =
    selected.map((item) => ({
      capabilityId: item.id,
      evidenceLevel: item.evidenceLevel,
      cost: item.cost,
      reasons: [
        "Selected as the lowest-cost relevant capability for evidence level " +
          item.evidenceLevel +
          ".",
        ...(item.deterministic
          ? ["Deterministic capability preferred."]
          : []),
      ],
    }));

  return {
    goal: input.goal,
    requiredEvidenceLevel,
    ...(currentEvidenceLevel === undefined
      ? {}
      : { currentEvidenceLevel }),
    disposition: "execute",
    steps,
    skippedCapabilityIds: input.capabilities
      .map((item) => item.id)
      .filter((id) => !selectedIds.has(id))
      .sort(),
    reasons: [
      "Plan contains only the minimum relevant evidence escalation needed to reach the requested analysis goal.",
      "Higher-cost or unrelated capabilities are skipped until evidence proves escalation is necessary.",
    ],
  };
}
