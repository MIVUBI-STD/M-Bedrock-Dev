import type {
  DiagnosticProbeDefinition,
  DiagnosticProbePlan,
} from "../../project-model/src/index.js";
import type {
  RuntimeProbeBinding,
  RuntimeProbeRequest,
  RuntimeProbeRequestBundle,
} from "../../project-model/src/index.js";
import {
  parseRuntimeProbeRequestBundle,
} from "../../project-model/src/index.js";
import type {
  InspectDirectoryResult,
} from "./types.js";
import {
  planDiagnosticProbes,
} from "./diagnostic-probe-planning.js";
import {
  compileRuntimeProbeRequests,
  type RuntimeProbeCompilationIssue,
} from "./runtime-probe-request-compiler.js";

export interface AdaptiveRuntimeProbeBudget {
  maxRequests: number;
  maxCostUnits: number;
}

export interface AdaptiveRuntimeProbeSelection {
  incidentId: string;
  probeId: string;
  score: number;
  costUnits: number;
  requestIds: readonly string[];
}

export interface AdaptiveRuntimeProbeBundle {
  bundle: RuntimeProbeRequestBundle;
  selected:
    readonly AdaptiveRuntimeProbeSelection[];
  skipped: readonly {
    incidentId: string;
    probeId: string;
    reason:
      | "request-budget"
      | "cost-budget"
      | "lower-value";
  }[];
  issues:
    readonly RuntimeProbeCompilationIssue[];
  usedRequests: number;
  usedCostUnits: number;
  reasons: readonly string[];
}

interface Candidate {
  incidentId: string;
  plan: DiagnosticProbePlan;
  definitions:
    readonly DiagnosticProbeDefinition[];
  item:
    DiagnosticProbePlan["recommended"][number];
}

function validateBudget(
  budget:
    AdaptiveRuntimeProbeBudget,
): void {
  if (
    !Number.isInteger(
      budget.maxRequests,
    ) ||
    budget.maxRequests < 0
  ) {
    throw new Error(
      "Adaptive runtime probe maxRequests must be a non-negative integer.",
    );
  }

  if (
    !Number.isInteger(
      budget.maxCostUnits,
    ) ||
    budget.maxCostUnits < 0
  ) {
    throw new Error(
      "Adaptive runtime probe maxCostUnits must be a non-negative integer.",
    );
  }
}

function candidateOrder(
  left: Candidate,
  right: Candidate,
): number {
  return (
    right.item.score -
      left.item.score ||
    right.item
      .pairSeparationCount -
      left.item
        .pairSeparationCount ||
    left.item.costUnits -
      right.item.costUnits ||
    left.incidentId.localeCompare(
      right.incidentId,
    ) ||
    left.item.probeId.localeCompare(
      right.item.probeId,
    )
  );
}

export function prepareAdaptiveRuntimeProbeBundle(
  inspection: {
    causalAnalysis: Pick<
      InspectDirectoryResult["causalAnalysis"],
      "incidents"
    >;
    diagnosticProbeAnalysis:
      InspectDirectoryResult[
        "diagnosticProbeAnalysis"
      ];
  },
  options: {
    availableContext:
      Parameters<
        typeof planDiagnosticProbes
      >[2];
    bindings:
      readonly RuntimeProbeBinding[];
    budget:
      AdaptiveRuntimeProbeBudget;
    artifactId?: string;
    sessionId?: string;
    runtimeTick?: number;
  },
): AdaptiveRuntimeProbeBundle {
  validateBudget(options.budget);

  const incidentsById =
    new Map(
      inspection.causalAnalysis
        .incidents.map(
          (incident) => [
            incident.id,
            incident,
          ],
        ),
    );

  const candidates:
    Candidate[] = [];

  for (
    const analysis of
      inspection
        .diagnosticProbeAnalysis
        .incidents
  ) {
    const incident =
      incidentsById.get(
        analysis.incidentId,
      );
    if (!incident) continue;

    const plan =
      planDiagnosticProbes(
        incident,
        analysis.definitions,
        options.availableContext,
      );

    for (
      const item of
        plan.recommended
    ) {
      candidates.push({
        incidentId:
          incident.id,
        plan,
        definitions:
          analysis.definitions,
        item,
      });
    }
  }

  candidates.sort(
    candidateOrder,
  );

  let usedRequests = 0;
  let usedCostUnits = 0;
  const selected:
    AdaptiveRuntimeProbeSelection[] =
      [];
  const skipped:
    AdaptiveRuntimeProbeBundle[
      "skipped"
    ][number][] = [];
  const requests:
    RuntimeProbeRequest[] = [];
  const issues:
    RuntimeProbeCompilationIssue[] =
      [];
  const selectedProbeKeys =
    new Set<string>();

  for (const candidate of candidates) {
    const key =
      candidate.incidentId +
      "::" +
      candidate.item.probeId;

    if (
      usedRequests >=
      options.budget.maxRequests
    ) {
      skipped.push({
        incidentId:
          candidate.incidentId,
        probeId:
          candidate.item.probeId,
        reason:
          "request-budget",
      });
      continue;
    }

    if (
      usedCostUnits +
        candidate.item.costUnits >
      options.budget.maxCostUnits
    ) {
      skipped.push({
        incidentId:
          candidate.incidentId,
        probeId:
          candidate.item.probeId,
        reason: "cost-budget",
      });
      continue;
    }

    const singlePlan:
      DiagnosticProbePlan = {
      ...candidate.plan,
      recommended: [
        candidate.item,
      ],
    };

    const compilation =
      compileRuntimeProbeRequests(
        singlePlan,
        candidate.definitions,
        options.bindings,
        {
          maxRequests: 1,
          ...(options.runtimeTick ===
          undefined
            ? {}
            : {
                runtimeTick:
                  options.runtimeTick,
              }),
          requestId: (
            probeId,
          ) =>
            [
              candidate
                .incidentId,
              probeId,
              usedRequests + 1,
            ].join("::"),
        },
      );

    issues.push(
      ...compilation.issues,
    );

    if (
      compilation.requests.length ===
      0
    ) {
      continue;
    }

    requests.push(
      ...compilation.requests,
    );
    usedRequests +=
      compilation.requests.length;
    usedCostUnits +=
      candidate.item.costUnits;
    selectedProbeKeys.add(key);
    selected.push({
      incidentId:
        candidate.incidentId,
      probeId:
        candidate.item.probeId,
      score:
        candidate.item.score,
      costUnits:
        candidate.item.costUnits,
      requestIds:
        compilation.requests.map(
          (request) =>
            request.requestId,
        ),
    });
  }

  for (const candidate of candidates) {
    const key =
      candidate.incidentId +
      "::" +
      candidate.item.probeId;

    if (
      selectedProbeKeys.has(key) ||
      skipped.some(
        (item) =>
          item.incidentId ===
            candidate.incidentId &&
          item.probeId ===
            candidate.item.probeId,
      )
    ) {
      continue;
    }

    skipped.push({
      incidentId:
        candidate.incidentId,
      probeId:
        candidate.item.probeId,
      reason: "lower-value",
    });
  }

  const incidentIds = [
    ...new Set(
      selected.map(
        (item) =>
          item.incidentId,
      ),
    ),
  ].sort();

  return {
    bundle:
      parseRuntimeProbeRequestBundle({
        schemaVersion: 1,
        ...(options.sessionId ===
        undefined
          ? {}
          : {
              sessionId:
                options.sessionId,
            }),
        ...(options.artifactId ===
        undefined
          ? {}
          : {
              artifactId:
                options.artifactId,
            }),
        ...(incidentIds.length === 0
          ? {}
          : { incidentIds }),
        requests,
      }),
    selected,
    skipped,
    issues,
    usedRequests,
    usedCostUnits,
    reasons: [
      "Probe candidates are globally ordered by diagnostic separation value and cost rather than receiving a fixed per-incident allowance.",
      "Budget exhaustion skips lower-value runtime work instead of silently exceeding the requested runtime cost.",
      String(usedRequests) +
        " request(s) selected using " +
        String(usedCostUnits) +
        " of " +
        String(
          options.budget
            .maxCostUnits,
        ) +
        " available cost units.",
    ],
  };
}
