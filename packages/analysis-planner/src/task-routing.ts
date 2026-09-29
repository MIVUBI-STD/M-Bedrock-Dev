import type {
  AnalysisExecutionContext,
  AnalysisGoal,
} from "./types.js";

export type EngineeringTaskKind =
  | "inspect"
  | "understand"
  | "find-bug"
  | "diagnose"
  | "verify-bug"
  | "repair"
  | "validate-repair"
  | "performance-audit"
  | "multiplayer-audit"
  | "compatibility-audit";

export interface EngineeringTaskRoutingInput {
  kind: EngineeringTaskKind;
  context:
    AnalysisExecutionContext;
  runtimeSensitive?: boolean;
  hasCandidateBug?: boolean;
  hasProvenDiagnosis?: boolean;
}

export interface EngineeringTaskRoute {
  kind: EngineeringTaskKind;
  initialGoal: AnalysisGoal;
  mutationAllowed: boolean;
  runtimeMayBeRequired: boolean;
  requiredPreconditions:
    readonly string[];
  stopCondition: string;
  reasons: readonly string[];
}

function runtimeCapable(
  context:
    AnalysisExecutionContext,
): boolean {
  return (
    context ===
      "LOCAL_MINECRAFT" ||
    context ===
      "LIVE_MINECRAFT"
  );
}

export function routeEngineeringTask(
  input:
    EngineeringTaskRoutingInput,
): EngineeringTaskRoute {
  switch (input.kind) {
    case "inspect":
      return {
        kind: input.kind,
        initialGoal:
          "artifact-fact",
        mutationAllowed: false,
        runtimeMayBeRequired:
          false,
        requiredPreconditions: [],
        stopCondition:
          "Artifact identity and requested structural facts are available.",
        reasons: [
          "Inspection starts at metadata/structural evidence and does not authorize mutation.",
        ],
      };

    case "understand":
      return {
        kind: input.kind,
        initialGoal:
          "authored-intent",
        mutationAllowed: false,
        runtimeMayBeRequired:
          false,
        requiredPreconditions: [],
        stopCondition:
          "Authored gameplay intent is grounded or the remaining unknown is explicitly named.",
        reasons: [
          "Understanding prioritizes authored intent before defect classification.",
        ],
      };

    case "find-bug":
    case "diagnose":
      return {
        kind: input.kind,
        initialGoal:
          "intent-classification",
        mutationAllowed: false,
        runtimeMayBeRequired:
          input.runtimeSensitive ===
            true,
        requiredPreconditions: [],
        stopCondition:
          "A defect/design classification is supported by sufficient evidence or the cheapest separating evidence is named.",
        reasons: [
          "Bug search begins from intent classification rather than assuming unusual behavior is defective.",
          ...(input.runtimeSensitive ===
          true
            ? [
                "Runtime evidence may be required, but static/semantic evidence should be exhausted first.",
              ]
            : []),
        ],
      };

    case "verify-bug":
      return {
        kind: input.kind,
        initialGoal:
          input.runtimeSensitive ===
          true
            ? "runtime-behavior"
            : "contradiction-proof",
        mutationAllowed: false,
        runtimeMayBeRequired:
          input.runtimeSensitive ===
            true,
        requiredPreconditions: [
          "candidate-bug",
        ],
        stopCondition:
          "The candidate is proven, falsified, or remains UNKNOWN with explicit separating evidence.",
        reasons: [
          input.runtimeSensitive ===
          true
            ? "Runtime-sensitive verification requires observed behavior rather than stronger static speculation."
            : "Non-runtime verification should seek a contradiction proof before escalating.",
        ],
      };

    case "repair":
      return {
        kind: input.kind,
        initialGoal:
          "causal-repair",
        mutationAllowed: true,
        runtimeMayBeRequired:
          true,
        requiredPreconditions: [
          "proven-diagnosis",
          "repair-invariants",
        ],
        stopCondition:
          "The smallest causally bound repair is applied and its required proof obligations are satisfied.",
        reasons: [
          "Repair authority starts only after diagnosis and preservation obligations are explicit.",
        ],
      };

    case "validate-repair":
      return {
        kind: input.kind,
        initialGoal:
          input.runtimeSensitive ===
          true
            ? "runtime-behavior"
            : "semantic-consistency",
        mutationAllowed: false,
        runtimeMayBeRequired:
          input.runtimeSensitive ===
            true,
        requiredPreconditions: [
          "applied-repair",
        ],
        stopCondition:
          "Affected validation and stale proof obligations are closed without introducing a regression.",
        reasons: [
          "Validation does not authorize adjacent cleanup or new repair work unless validation exposes a new defect.",
        ],
      };

    case "performance-audit":
      return {
        kind: input.kind,
        initialGoal:
          runtimeCapable(
            input.context,
          )
            ? "runtime-behavior"
            : "semantic-consistency",
        mutationAllowed: false,
        runtimeMayBeRequired: true,
        requiredPreconditions: [],
        stopCondition:
          runtimeCapable(
            input.context,
          )
            ? "Measured runtime evidence identifies the relevant cost surface or rules it out."
            : "Static cost risks are identified and runtime residue is explicitly named.",
        reasons: [
          "Performance claims require runtime evidence for measured conclusions; static analysis can only identify risk surfaces.",
        ],
      };

    case "multiplayer-audit":
      return {
        kind: input.kind,
        initialGoal:
          runtimeCapable(
            input.context,
          )
            ? "runtime-behavior"
            : "intent-classification",
        mutationAllowed: false,
        runtimeMayBeRequired: true,
        requiredPreconditions: [],
        stopCondition:
          "Session ownership/concurrency invariants are proven at the strongest available context and higher-context residue is explicit.",
        reasons: [
          "Multiplayer semantics begin from ownership intent and require real runtime evidence for timing/concurrency claims.",
        ],
      };

    case "compatibility-audit":
      return {
        kind: input.kind,
        initialGoal:
          "runtime-evidence-integrity",
        mutationAllowed: false,
        runtimeMayBeRequired: true,
        requiredPreconditions: [
          "target-runtime-profile",
        ],
        stopCondition:
          "Profile-specific behavior is distinguished from authored defects with isolated evidence per runtime profile.",
        reasons: [
          "Compatibility differences must not be promoted to project defects without target-policy and authored-intent evidence.",
        ],
      };
  }
}

export function assertEngineeringTaskPreconditions(
  route: EngineeringTaskRoute,
  state: {
    hasCandidateBug?: boolean;
    hasProvenDiagnosis?: boolean;
    hasRepairInvariants?: boolean;
    hasAppliedRepair?: boolean;
    hasTargetRuntimeProfile?: boolean;
  },
): void {
  const missing: string[] = [];

  for (
    const requirement of
      route.requiredPreconditions
  ) {
    if (
      requirement ===
        "candidate-bug" &&
      state.hasCandidateBug !==
        true
    ) {
      missing.push(requirement);
    }
    if (
      requirement ===
        "proven-diagnosis" &&
      state.hasProvenDiagnosis !==
        true
    ) {
      missing.push(requirement);
    }
    if (
      requirement ===
        "repair-invariants" &&
      state.hasRepairInvariants !==
        true
    ) {
      missing.push(requirement);
    }
    if (
      requirement ===
        "applied-repair" &&
      state.hasAppliedRepair !==
        true
    ) {
      missing.push(requirement);
    }
    if (
      requirement ===
        "target-runtime-profile" &&
      state.hasTargetRuntimeProfile !==
        true
    ) {
      missing.push(requirement);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      "Engineering task preconditions are missing: " +
        missing.join(", ") +
        ".",
    );
  }
}
