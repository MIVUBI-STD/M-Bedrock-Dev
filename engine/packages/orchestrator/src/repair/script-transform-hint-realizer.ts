import {
  SCRIPT_REPAIR_HINT_ANALYZER_ID,
  SCRIPT_REPAIR_HINT_ANALYZER_REVISION,
  SCRIPT_REPAIR_HINT_PARSER_ID,
  SCRIPT_REPAIR_HINT_PARSER_REVISION,
} from "../../../../analyzers/scripts/src/index.js";
import type { SemanticGraph } from "../../../graph/src/index.js";
import {
  validateRepairSourceTransformHint,
  type RepairSourceTransformHint,
  type SourceRef,
} from "../../../project-model/src/index.js";
import {
  createPatchTransaction,
} from "../../../repair/src/index.js";
import type {
  ValidationStep,
} from "../../../validation/src/index.js";
import {
  deriveChangedSemanticNodeIds,
} from "./repair-changed-node-derivation.js";
import {
  repairRealizerForSource,
  type RepairRealizerRegistry,
} from "./repair-realizer-registry.js";
import type {
  RepairStrategyEnumeration,
} from "./repair-strategy-enumeration.js";
import type {
  RepairStrategyCandidate,
} from "./repair-strategy-selection.js";
import type {
  RepairStrategySourceRegistry,
} from "./repair-strategy-source-registry.js";

export interface RepairTransformHintProposal {
  sourceKind: "built-in-planner";
  sourceId: string;
  sourceVersion: string;
  realizerId: string;
  realizerVersion: string;
  hintId: string;
  hintFamily: RepairSourceTransformHint["family"];
  strategy: RepairStrategyCandidate;
}

export type RepairTransformHintRealization =
  | {
      status: "realized";
      proposal: RepairTransformHintProposal;
      reasons: readonly string[];
    }
  | {
      status: "blocked";
      sourceId: string;
      reasons: readonly string[];
    };

function sameSource(
  left: SourceRef,
  right: SourceRef,
): boolean {
  return (
    left.artifactId === right.artifactId &&
    left.relativePath === right.relativePath &&
    left.range?.lineStart === right.range?.lineStart &&
    left.range?.lineEnd === right.range?.lineEnd &&
    left.range?.columnStart === right.range?.columnStart &&
    left.range?.columnEnd === right.range?.columnEnd &&
    left.jsonPointer === right.jsonPointer
  );
}

function validationSteps(
  hint: RepairSourceTransformHint,
): {
  steps: ValidationStep[];
  errors: string[];
} {
  const steps: ValidationStep[] = [];
  const errors: string[] = [];

  for (
    const kind of
      [...new Set(hint.validationKinds)]
  ) {
    if (kind === "reparse") {
      steps.push({
        kind: "reparse",
        source: hint.source,
      });
      continue;
    }
    if (kind === "rebuild-graph") {
      steps.push({
        kind: "rebuild-graph",
      });
      continue;
    }

    errors.push(
      "Repair transform hint validation kind " +
        kind +
        " requires additional diagnostic identity and cannot be realized generically.",
    );
  }

  return { steps, errors };
}

function allCovered(
  required: readonly string[] | undefined,
  supported: readonly string[],
): boolean {
  return (required ?? []).every((id) =>
    supported.includes(id)
  );
}

function realizeGenerationGuardHint(
  graph: SemanticGraph,
  enumeration: RepairStrategyEnumeration,
  sourceRegistry: RepairStrategySourceRegistry,
  realizerRegistry: RepairRealizerRegistry,
  hint: RepairSourceTransformHint,
  expectedFamily:
    | "scheduler-generation-guard"
    | "session-generation-guard"
    | "persistence-idempotency-guard"
    | "arena-ownership-guard"
    | "arena-capacity-guard",
  sourceId: string,
  label: string,
): RepairTransformHintRealization {
  const enumerated =
    enumeration.applicableSources.find(
      (item) =>
        item.sourceKind ===
          "built-in-planner" &&
        item.sourceId === sourceId,
    );

  if (!enumerated) {
    return {
      status: "blocked",
      sourceId,
      reasons: [
        label +
          " source is not applicable to this repair opportunity.",
      ],
    };
  }

  if (!enumerated.automaticRealizationEligible) {
    return {
      status: "blocked",
      sourceId,
      reasons: [
        label +
          " source is not eligible for automatic realization under the current opportunity.",
      ],
    };
  }

  const sourceDefinition =
    sourceRegistry.sources.find(
      (item) =>
        item.kind === "built-in-planner" &&
        item.id === sourceId &&
        item.version ===
          enumerated.sourceVersion,
    );
  if (!sourceDefinition) {
    return {
      status: "blocked",
      sourceId,
      reasons: [
        "Enumerated " +
          label.toLowerCase() +
          " source is not present at the expected version.",
      ],
    };
  }

  const realizer = repairRealizerForSource(
    realizerRegistry,
    "built-in-planner",
    sourceId,
  );
  if (!realizer) {
    return {
      status: "blocked",
      sourceId,
      reasons: [
        label +
          " source has no registered deterministic realizer.",
      ],
    };
  }

  const errors = [
    ...validateRepairSourceTransformHint(hint),
  ];

  if (hint.family !== expectedFamily) {
    errors.push(
      "Repair transform hint family does not match " +
        label.toLowerCase() +
        " realization.",
    );
  }
  if (
    hint.analyzerId !==
      SCRIPT_REPAIR_HINT_ANALYZER_ID ||
    hint.analyzerRevision !==
      SCRIPT_REPAIR_HINT_ANALYZER_REVISION
  ) {
    errors.push(
      "Repair transform hint analyzer identity/revision is stale or unsupported.",
    );
  }
  if (
    hint.parserId !==
      SCRIPT_REPAIR_HINT_PARSER_ID ||
    hint.parserRevision !==
      SCRIPT_REPAIR_HINT_PARSER_REVISION
  ) {
    errors.push(
      "Repair transform hint parser identity/revision is stale or unsupported.",
    );
  }
  if (
    !enumeration.envelope.exactSourceRefs.some(
      (source) => sameSource(source, hint.source),
    )
  ) {
    errors.push(
      "Repair transform hint source is not exact source evidence for the selected causal opportunity.",
    );
  }
  if (
    !allCovered(
      enumeration.envelope.causalBinding
        .predicateIds,
      hint.supportedPredicateIds,
    )
  ) {
    errors.push(
      "Repair transform hint does not cover every causal predicate in the repair opportunity.",
    );
  }
  if (
    !allCovered(
      enumeration.envelope.causalBinding
        .factorIds,
      hint.supportedFactorIds,
    )
  ) {
    errors.push(
      "Repair transform hint does not cover every controlled causal factor in the repair opportunity.",
    );
  }
  if (
    sourceDefinition.selectionMode !==
      "causal-auto" ||
    !sourceDefinition.deterministic ||
    !realizer.deterministic
  ) {
    errors.push(
      label +
        " automatic realization requires deterministic causal-auto source and realizer definitions.",
    );
  }

  const validation =
    validationSteps(hint);
  errors.push(...validation.errors);

  if (errors.length > 0) {
    return {
      status: "blocked",
      sourceId,
      reasons: [...new Set(errors)].sort(),
    };
  }

  const transaction = createPatchTransaction({
    title:
      "insert " +
      label.toLowerCase(),
    sourceFingerprint:
      enumeration.envelope.sourceFingerprint,
    requiredProofs: ["post-transform"],
    operations: [{
      kind: "replace-text",
      source: hint.source,
      expected: hint.expectedText,
      replacement: hint.replacementText,
    }],
    preconditions: [{
      kind: "source-fingerprint",
      expected:
        enumeration.envelope.sourceFingerprint,
    }],
    validation: validation.steps,
  });

  const changed = deriveChangedSemanticNodeIds(
    graph,
    transaction,
  );
  if (
    changed.unmatchedOperationPaths.length > 0 ||
    changed.changedNodeIds.length === 0
  ) {
    return {
      status: "blocked",
      sourceId,
      reasons: [
        label +
          " transform source does not map to the current semantic graph.",
      ],
    };
  }

  return {
    status: "realized",
    proposal: {
      sourceKind: "built-in-planner",
      sourceId,
      sourceVersion:
        sourceDefinition.version,
      realizerId: realizer.id,
      realizerVersion: realizer.version,
      hintId: hint.id,
      hintFamily: hint.family,
      strategy: {
        strategyId:
          sourceId + ":" + transaction.id,
        transaction,
        changedNodeIds:
          changed.changedNodeIds,
        supportingInvariantIds:
          enumeration.envelope.invariantIds,
        addressesCandidateIds: [
          enumeration.envelope.candidateId,
        ],
        repairClass:
          sourceDefinition.repairClass,
        causalBinding:
          enumeration.envelope.causalBinding,
        postTransformProofRequired: true,
        validationObligations: {
          invariantIds:
            enumeration.envelope.invariantIds,
          runtimeExperimentIds:
            enumeration.envelope.causalBinding
              .interventionIds ?? [],
          validationKinds:
            validation.steps
              .map((step) => step.kind)
              .sort(),
        },
        reversible: true,
        idempotent: false,
      },
    },
    reasons: [
      label +
        " was realized from an analyzer-owned exact source-transform hint without synthesizing source syntax from runtime predicates.",
    ],
  };
}

export function realizeSchedulerGenerationGuardHint(
  graph: SemanticGraph,
  enumeration: RepairStrategyEnumeration,
  sourceRegistry: RepairStrategySourceRegistry,
  realizerRegistry: RepairRealizerRegistry,
  hint: RepairSourceTransformHint,
): RepairTransformHintRealization {
  return realizeGenerationGuardHint(
    graph,
    enumeration,
    sourceRegistry,
    realizerRegistry,
    hint,
    "scheduler-generation-guard",
    "scheduler-generation-guard-template",
    "Scheduler generation guard",
  );
}

export function realizeSessionGenerationGuardHint(
  graph: SemanticGraph,
  enumeration: RepairStrategyEnumeration,
  sourceRegistry: RepairStrategySourceRegistry,
  realizerRegistry: RepairRealizerRegistry,
  hint: RepairSourceTransformHint,
): RepairTransformHintRealization {
  return realizeGenerationGuardHint(
    graph,
    enumeration,
    sourceRegistry,
    realizerRegistry,
    hint,
    "session-generation-guard",
    "session-generation-guard-template",
    "Session generation guard",
  );
}


export function realizePersistenceIdempotencyGuardHint(
  graph: SemanticGraph,
  enumeration: RepairStrategyEnumeration,
  sourceRegistry: RepairStrategySourceRegistry,
  realizerRegistry: RepairRealizerRegistry,
  hint: RepairSourceTransformHint,
): RepairTransformHintRealization {
  return realizeGenerationGuardHint(
    graph,
    enumeration,
    sourceRegistry,
    realizerRegistry,
    hint,
    "persistence-idempotency-guard",
    "persistence-idempotency-guard-template",
    "Persistence idempotency guard",
  );
}


export function realizeArenaCapacityGuardHint(
  graph: SemanticGraph,
  enumeration: RepairStrategyEnumeration,
  sourceRegistry: RepairStrategySourceRegistry,
  realizerRegistry: RepairRealizerRegistry,
  hint: RepairSourceTransformHint,
): RepairTransformHintRealization {
  return realizeGenerationGuardHint(
    graph,
    enumeration,
    sourceRegistry,
    realizerRegistry,
    hint,
    "arena-capacity-guard",
    "arena-capacity-guard-template",
    "Arena capacity guard",
  );
}


export function realizeArenaStartOwnershipGuardHint(
  graph: SemanticGraph,
  enumeration: RepairStrategyEnumeration,
  sourceRegistry: RepairStrategySourceRegistry,
  realizerRegistry: RepairRealizerRegistry,
  hint: RepairSourceTransformHint,
): RepairTransformHintRealization {
  return realizeGenerationGuardHint(
    graph,
    enumeration,
    sourceRegistry,
    realizerRegistry,
    hint,
    "arena-ownership-guard",
    "arena-ownership-guard-template",
    "Arena start ownership guard",
  );
}
