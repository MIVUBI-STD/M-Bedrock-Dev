import type {
  DiagnosticProbeDefinition,
  DiagnosticProbePlan,
} from "../../project-model/src/diagnostic-probe.js";
import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";
import type {
  RuntimeProbeBinding,
  RuntimeProbeRequest,
} from "../../project-model/src/runtime-probe.js";
import { parseRuntimeProbeRequest } from "../../project-model/src/runtime-probe-validate.js";

export type RuntimeProbeCompilationIssueKind =
  | "missing-probe-definition"
  | "missing-binding"
  | "duplicate-binding"
  | "non-read-only-probe"
  | "binding-outcome-unknown"
  | "request-budget-exceeded";

export interface RuntimeProbeCompilationIssue {
  kind: RuntimeProbeCompilationIssueKind;
  probeId: string;
  detail: string;
}

export interface RuntimeProbeRequestCompilerOptions {
  scope?: RuntimeScope;
  runtimeTick?: number;
  maxRequests?: number;
  requestId?: (probeId: string, index: number) => string;
}

export interface RuntimeProbeCompilation {
  requests: RuntimeProbeRequest[];
  issues: RuntimeProbeCompilationIssue[];
}

function outcomeIds(probe: DiagnosticProbeDefinition): Set<string> {
  return new Set(probe.outcomes.map((outcome) => outcome.id));
}

function validateBindingOutcomes(
  probe: DiagnosticProbeDefinition,
  binding: RuntimeProbeBinding,
): string[] {
  const allowed = outcomeIds(probe);
  const ids = [
    binding.outcomeByState.present,
    binding.outcomeByState.absent,
    binding.outcomeByState.unknown,
  ].filter((value): value is string => value !== undefined);

  return ids.filter((id) => !allowed.has(id));
}

export function compileRuntimeProbeRequests(
  plan: DiagnosticProbePlan,
  probes: readonly DiagnosticProbeDefinition[],
  bindings: readonly RuntimeProbeBinding[],
  options: RuntimeProbeRequestCompilerOptions = {},
): RuntimeProbeCompilation {
  const maxRequests = options.maxRequests ?? plan.recommended.length;
  if (!Number.isInteger(maxRequests) || maxRequests < 0) {
    throw new Error("maxRequests must be a non-negative integer.");
  }

  const probesById = new Map(probes.map((probe) => [probe.id, probe]));
  const bindingsById = new Map<string, RuntimeProbeBinding[]>();
  for (const binding of bindings) {
    const list = bindingsById.get(binding.probeId) ?? [];
    list.push(binding);
    bindingsById.set(binding.probeId, list);
  }

  const issues: RuntimeProbeCompilationIssue[] = [];
  const requests: RuntimeProbeRequest[] = [];

  for (const item of plan.recommended) {
    if (requests.length >= maxRequests) {
      issues.push({
        kind: "request-budget-exceeded",
        probeId: item.probeId,
        detail:
          "Probe was recommended but excluded by maxRequests budget.",
      });
      continue;
    }

    const probe = probesById.get(item.probeId);
    if (!probe) {
      issues.push({
        kind: "missing-probe-definition",
        probeId: item.probeId,
        detail: "Recommended probe has no matching definition.",
      });
      continue;
    }

    if (probe.mutationRisk !== "read-only") {
      issues.push({
        kind: "non-read-only-probe",
        probeId: item.probeId,
        detail:
          "RuntimeProbeRequest supports bounded read-only queries only.",
      });
      continue;
    }

    const candidates = bindingsById.get(item.probeId) ?? [];
    if (candidates.length === 0) {
      issues.push({
        kind: "missing-binding",
        probeId: item.probeId,
        detail:
          "No explicit RuntimeProbeBinding supplies a safe runtime query.",
      });
      continue;
    }
    if (candidates.length > 1) {
      issues.push({
        kind: "duplicate-binding",
        probeId: item.probeId,
        detail:
          "Multiple runtime bindings exist; request compilation is ambiguous.",
      });
      continue;
    }

    const binding = candidates[0]!;
    const invalidOutcomes = validateBindingOutcomes(probe, binding);
    if (invalidOutcomes.length > 0) {
      issues.push({
        kind: "binding-outcome-unknown",
        probeId: item.probeId,
        detail:
          "Binding references outcome id(s) not declared by the diagnostic probe: " +
          invalidOutcomes.join(", "),
      });
      continue;
    }

    const index = requests.length;
    const request: RuntimeProbeRequest = {
      schemaVersion: 1,
      requestId:
        options.requestId?.(item.probeId, index) ??
        plan.incidentId + "::" + item.probeId + "::" + (index + 1),
      probeId: item.probeId,
      predicate: binding.predicate,
      ...(options.scope === undefined
        ? {}
        : { scope: options.scope }),
      ...(options.runtimeTick === undefined
        ? {}
        : { runtimeTick: options.runtimeTick }),
      query: binding.query,
      outcomeByState: binding.outcomeByState,
    };

    requests.push(parseRuntimeProbeRequest(request));
  }

  return { requests, issues };
}
