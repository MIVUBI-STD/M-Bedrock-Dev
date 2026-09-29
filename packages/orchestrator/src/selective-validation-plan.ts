import type {
  ValidationScenario,
} from "../../validation/src/index.js";
import type {
  SemanticAffectedPlan,
} from "./semantic-affected-plan.js";

export interface ValidationScenarioImpactBinding {
  scenarioId: string;
  semanticNodeIds?: readonly string[];
  sourcePaths?: readonly string[];
  alwaysRun?: boolean;
  reason?: string;
}

export type SelectiveValidationSelectionReason =
  | "always-run"
  | "affected-node"
  | "affected-path"
  | "unbound-conservative";

export interface SelectedValidationScenario {
  scenarioId: string;
  title: string;
  reason:
    SelectiveValidationSelectionReason;
  detail: string;
}

export interface SkippedValidationScenario {
  scenarioId: string;
  title: string;
  reason: "outside-affected-closure";
  detail: string;
}

export interface SelectiveValidationPlan {
  status: "planned" | "blocked";
  selected: readonly SelectedValidationScenario[];
  skipped: readonly SkippedValidationScenario[];
  totalScenarioCount: number;
  selectedScenarioCount: number;
  skippedScenarioCount: number;
  skipRatio: number;
  affectedNodeCount: number;
  affectedPathCount: number;
  reasons: readonly string[];
  errors: readonly string[];
}

function uniqueSorted(
  values: readonly string[] | undefined,
): string[] {
  return [
    ...new Set(
      (values ?? []).filter(
        (value) => value.trim().length > 0,
      ),
    ),
  ].sort();
}

function bindingErrors(
  scenarios: readonly ValidationScenario[],
  bindings: readonly ValidationScenarioImpactBinding[],
  affected: SemanticAffectedPlan,
): string[] {
  const errors: string[] = [];
  const scenarioIds = new Set(
    scenarios.map((scenario) => scenario.id),
  );
  const knownNodeIds = new Set([
    ...affected.affectedNodeIds,
    ...affected.skippedNodeIds,
  ]);
  const seen = new Set<string>();

  for (const binding of bindings) {
    if (!scenarioIds.has(binding.scenarioId)) {
      errors.push(
        "Impact binding references unknown validation scenario: " +
          binding.scenarioId +
          ".",
      );
    }

    if (seen.has(binding.scenarioId)) {
      errors.push(
        "Duplicate impact binding for validation scenario: " +
          binding.scenarioId +
          ".",
      );
    }
    seen.add(binding.scenarioId);

    const nodeIds =
      uniqueSorted(
        binding.semanticNodeIds,
      );
    const sourcePaths =
      uniqueSorted(
        binding.sourcePaths,
      );

    if (
      binding.alwaysRun !== true &&
      nodeIds.length === 0 &&
      sourcePaths.length === 0
    ) {
      errors.push(
        "Validation impact binding must declare semanticNodeIds, sourcePaths, or alwaysRun=true: " +
          binding.scenarioId +
          ".",
      );
    }

    for (const nodeId of nodeIds) {
      if (!knownNodeIds.has(nodeId)) {
        errors.push(
          "Validation impact binding references semantic node absent from the current affected graph: " +
            binding.scenarioId +
            " -> " +
            nodeId +
            ".",
        );
      }
    }
  }

  return errors.sort();
}

export function planSelectiveValidation(
  scenarios: readonly ValidationScenario[],
  bindings: readonly ValidationScenarioImpactBinding[],
  affected: SemanticAffectedPlan,
): SelectiveValidationPlan {
  if (affected.status !== "planned") {
    return {
      status: "blocked",
      selected: [],
      skipped: [],
      totalScenarioCount:
        scenarios.length,
      selectedScenarioCount: 0,
      skippedScenarioCount: 0,
      skipRatio: 0,
      affectedNodeCount:
        affected.affectedNodeCount,
      affectedPathCount:
        affected.affectedPaths.length,
      reasons: [
        "Selective validation requires a proven semantic affected plan.",
      ],
      errors: [
        ...affected.reasons,
      ],
    };
  }

  const errors =
    bindingErrors(
      scenarios,
      bindings,
      affected,
    );

  if (errors.length > 0) {
    return {
      status: "blocked",
      selected: [],
      skipped: [],
      totalScenarioCount:
        scenarios.length,
      selectedScenarioCount: 0,
      skippedScenarioCount: 0,
      skipRatio: 0,
      affectedNodeCount:
        affected.affectedNodeCount,
      affectedPathCount:
        affected.affectedPaths.length,
      reasons: [
        "Selective validation was disabled because impact bindings are stale or malformed.",
        "Run the conservative validation set until bindings are repaired.",
      ],
      errors,
    };
  }

  const byScenario = new Map(
    bindings.map((binding) => [
      binding.scenarioId,
      binding,
    ]),
  );
  const affectedNodes =
    new Set(
      affected.affectedNodeIds,
    );
  const affectedPaths =
    new Set(
      affected.affectedPaths,
    );

  const selected:
    SelectedValidationScenario[] = [];
  const skipped:
    SkippedValidationScenario[] = [];

  for (
    const scenario of [...scenarios]
      .sort((a, b) =>
        a.id.localeCompare(b.id)
      )
  ) {
    const binding =
      byScenario.get(scenario.id);

    if (!binding) {
      selected.push({
        scenarioId: scenario.id,
        title: scenario.title,
        reason:
          "unbound-conservative",
        detail:
          "Scenario has no semantic impact binding, so it remains selected rather than being skipped speculatively.",
      });
      continue;
    }

    if (binding.alwaysRun === true) {
      selected.push({
        scenarioId: scenario.id,
        title: scenario.title,
        reason: "always-run",
        detail:
          binding.reason?.trim() ||
          "Scenario is explicitly marked as always-run.",
      });
      continue;
    }

    const matchingNodes =
      uniqueSorted(
        binding.semanticNodeIds,
      ).filter((nodeId) =>
        affectedNodes.has(nodeId)
      );

    if (matchingNodes.length > 0) {
      selected.push({
        scenarioId: scenario.id,
        title: scenario.title,
        reason: "affected-node",
        detail:
          "Affected semantic node(s): " +
          matchingNodes.join(", ") +
          ".",
      });
      continue;
    }

    const matchingPaths =
      uniqueSorted(
        binding.sourcePaths,
      ).filter((path) =>
        affectedPaths.has(path)
      );

    if (matchingPaths.length > 0) {
      selected.push({
        scenarioId: scenario.id,
        title: scenario.title,
        reason: "affected-path",
        detail:
          "Affected source path(s): " +
          matchingPaths.join(", ") +
          ".",
      });
      continue;
    }

    skipped.push({
      scenarioId: scenario.id,
      title: scenario.title,
      reason:
        "outside-affected-closure",
      detail:
        "Bound semantic nodes and source paths do not intersect the current affected closure.",
    });
  }

  const skipRatio =
    scenarios.length === 0
      ? 0
      : skipped.length /
        scenarios.length;

  return {
    status: "planned",
    selected,
    skipped,
    totalScenarioCount:
      scenarios.length,
    selectedScenarioCount:
      selected.length,
    skippedScenarioCount:
      skipped.length,
    skipRatio,
    affectedNodeCount:
      affected.affectedNodeCount,
    affectedPathCount:
      affected.affectedPaths.length,
    reasons: [
      "Only scenarios with a proven affected binding are selectively skipped.",
      "Unbound scenarios remain selected by default.",
      skipped.length === 0
        ? "No validation scenarios can be safely skipped for the current change."
        : String(skipped.length) +
          " of " +
          String(scenarios.length) +
          " validation scenarios are outside the affected closure and can be skipped.",
    ],
    errors: [],
  };
}

function percentage(
  ratio: number,
): string {
  return (
    Math.round(ratio * 1000) / 10
  ).toFixed(1) + "%";
}

export function selectiveValidationPlanText(
  plan: SelectiveValidationPlan,
): string {
  const lines = [
    "Selective Validation Plan",
    "Status: " + plan.status,
    "Affected semantic nodes: " +
      String(plan.affectedNodeCount),
    "Affected source paths: " +
      String(plan.affectedPathCount),
    "Scenarios: " +
      String(plan.totalScenarioCount),
    "Selected: " +
      String(plan.selectedScenarioCount),
    "Skipped: " +
      String(plan.skippedScenarioCount),
    "Skip ratio: " +
      percentage(plan.skipRatio),
  ];

  if (plan.errors.length > 0) {
    lines.push("", "Errors");
    for (const error of plan.errors) {
      lines.push("- " + error);
    }
  }

  lines.push("", "Selected");

  if (plan.selected.length === 0) {
    lines.push("- none");
  } else {
    for (const item of plan.selected) {
      lines.push(
        "- " +
          item.scenarioId +
          " [" +
          item.reason +
          "]: " +
          item.detail,
      );
    }
  }

  lines.push("", "Skipped");

  if (plan.skipped.length === 0) {
    lines.push("- none");
  } else {
    for (const item of plan.skipped) {
      lines.push(
        "- " +
          item.scenarioId +
          ": " +
          item.detail,
      );
    }
  }

  return lines.join("\n") + "\n";
}
