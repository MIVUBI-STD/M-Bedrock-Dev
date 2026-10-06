import type { RuntimeEvidenceRecord } from "../../../project-model/src/index.js";
import type {
  StateAuthorityContract,
  StateObservedValue,
  StateValueObservation,
} from "../../../project-model/src/index.js";
import type {
  GameplayIntentModel,
} from "../../../gameplay-intent/src/index.js";
import { stateSurfaceKey } from "../../../project-model/src/index.js";
import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../../diagnostics/src/index.js";

export type StateMirrorStatus =
  | "consistent"
  | "value-drift"
  | "revision-stale"
  | "authority-missing"
  | "mirror-missing"
  | "ambiguous";

export interface StateMirrorCorrelation {
  contractId: string;
  scopeKey: string;
  mirrorKey: string;
  status: StateMirrorStatus;
  authorityValue?: StateObservedValue;
  mirrorValue?: StateObservedValue;
  authorityRevision?: number;
  mirrorRevision?: number;
}

function observationKey(scopeKey: string, surfaceKey: string): string {
  return scopeKey + "\u0000" + surfaceKey;
}

function sameValue(a: StateObservedValue, b: StateObservedValue): boolean {
  return a === b;
}

export function correlateStateAuthority(
  contracts: readonly StateAuthorityContract[],
  observations: readonly StateValueObservation[],
): StateMirrorCorrelation[] {
  const grouped = new Map<string, StateValueObservation[]>();
  const scopes = new Set(observations.map((item) => item.scopeKey));

  for (const item of observations) {
    const key = observationKey(item.scopeKey, stateSurfaceKey(item.surface));
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  }

  const output: StateMirrorCorrelation[] = [];

  for (const contract of contracts) {
    const authorityKey = stateSurfaceKey(contract.authority);

    for (const scopeKey of scopes) {
      const authorityObservations =
        grouped.get(observationKey(scopeKey, authorityKey)) ?? [];

      for (const mirror of contract.mirrors) {
        const mirrorKey = stateSurfaceKey(mirror);
        const mirrorObservations =
          grouped.get(observationKey(scopeKey, mirrorKey)) ?? [];

        if (authorityObservations.length === 0 && mirrorObservations.length === 0) {
          continue;
        }
        if (authorityObservations.length !== 1 || mirrorObservations.length > 1) {
          output.push({
            contractId: contract.id,
            scopeKey,
            mirrorKey,
            status: authorityObservations.length === 0
              ? "authority-missing"
              : mirrorObservations.length === 0
                ? "mirror-missing"
                : "ambiguous",
          });
          continue;
        }

        if (mirrorObservations.length === 0) {
          output.push({
            contractId: contract.id,
            scopeKey,
            mirrorKey,
            status: "mirror-missing",
            authorityValue: authorityObservations[0]!.value,
            ...(authorityObservations[0]!.revision === undefined
              ? {}
              : { authorityRevision: authorityObservations[0]!.revision }),
          });
          continue;
        }

        const authority = authorityObservations[0]!;
        const observedMirror = mirrorObservations[0]!;

        if (
          authority.revision !== undefined &&
          observedMirror.revision !== undefined &&
          observedMirror.revision < authority.revision
        ) {
          output.push({
            contractId: contract.id,
            scopeKey,
            mirrorKey,
            status: "revision-stale",
            authorityValue: authority.value,
            mirrorValue: observedMirror.value,
            authorityRevision: authority.revision,
            mirrorRevision: observedMirror.revision,
          });
          continue;
        }

        output.push({
          contractId: contract.id,
          scopeKey,
          mirrorKey,
          status: sameValue(authority.value, observedMirror.value)
            ? "consistent"
            : "value-drift",
          authorityValue: authority.value,
          mirrorValue: observedMirror.value,
          ...(authority.revision === undefined
            ? {}
            : { authorityRevision: authority.revision }),
          ...(observedMirror.revision === undefined
            ? {}
            : { mirrorRevision: observedMirror.revision }),
        });
      }
    }
  }

  return output.sort((a, b) =>
    a.contractId.localeCompare(b.contractId) ||
    a.scopeKey.localeCompare(b.scopeKey) ||
    a.mirrorKey.localeCompare(b.mirrorKey)
  );
}

export function stateAuthorityRuntimeEvidence(
  correlations: readonly StateMirrorCorrelation[],
): RuntimeEvidenceRecord[] {
  return correlations.flatMap((item): RuntimeEvidenceRecord[] => {
    const scope = {
      operationId:
        "state:" +
        item.contractId +
        ":" +
        item.scopeKey +
        ":" +
        item.mirrorKey,
    };
    const records: RuntimeEvidenceRecord[] = [];

    if (
      item.status === "consistent" ||
      item.status === "value-drift" ||
      item.status === "revision-stale" ||
      item.status === "mirror-missing"
    ) {
      records.push({
        predicate: "state-authority-observed",
        state: "present",
        confidence: "observed",
        scope,
        note: item.contractId,
      });
    }

    if (
      item.status === "consistent" ||
      item.status === "value-drift" ||
      item.status === "revision-stale" ||
      item.status === "authority-missing"
    ) {
      records.push({
        predicate: "state-mirror-observed",
        state: "present",
        confidence: "observed",
        scope,
        note: item.mirrorKey,
      });
    }

    if (item.status === "consistent") {
      records.push({
        predicate: "state-mirror-consistent",
        state: "present",
        confidence: "observed",
        scope,
        note: item.mirrorKey,
      });
    } else if (
      item.status === "value-drift" ||
      item.status === "revision-stale"
    ) {
      records.push({
        predicate: "state-mirror-consistent",
        state: "absent",
        confidence: "observed",
        scope,
        note: item.mirrorKey + ":" + item.status,
      });
    }

    if (item.status === "authority-missing") {
      records.push({
        predicate: "state-authority-observed",
        state: "absent",
        confidence: "observed",
        scope,
        note: item.contractId,
      });
    }

    return records;
  });
}


export type ObjectiveAuthorityStatus =
  | "declared"
  | "undeclared"
  | "multiple-authorities";

export interface ObjectiveAuthorityAssessment {
  readonly objectiveId: string;
  readonly objectiveLabel: string;
  readonly status: ObjectiveAuthorityStatus;
  readonly contractIds: readonly string[];
  readonly authorityKeys: readonly string[];
  readonly reason: string;
}

function normalizedObjectiveAuthorityKey(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function assessObjectiveAuthorityDeclarations(
  intent: GameplayIntentModel,
  contracts: readonly StateAuthorityContract[],
): ObjectiveAuthorityAssessment[] {
  const objectives =
    intent.nodes.filter(
      (node) =>
        node.kind === "objective",
    );

  return objectives
    .map((objective) => {
      const objectiveKeys =
        new Set([
          normalizedObjectiveAuthorityKey(
            objective.id,
          ),
          normalizedObjectiveAuthorityKey(
            objective.label,
          ),
        ]);
      const matching =
        contracts.filter((contract) => {
          const purpose =
            contract.purpose?.trim();
          if (!purpose) return false;
          return objectiveKeys.has(
            normalizedObjectiveAuthorityKey(
              purpose,
            ),
          );
        });
      const authorityKeys =
        [
          ...new Set(
            matching.map((contract) =>
              stateSurfaceKey(
                contract.authority,
              )
            ),
          ),
        ].sort();
      const status:
        ObjectiveAuthorityStatus =
        matching.length === 0
          ? "undeclared"
          : authorityKeys.length > 1
            ? "multiple-authorities"
            : "declared";

      return {
        objectiveId:
          objective.id,
        objectiveLabel:
          objective.label,
        status,
        contractIds:
          matching
            .map((contract) =>
              contract.id
            )
            .sort(),
        authorityKeys,
        reason:
          status === "undeclared"
            ? "No StateAuthorityContract purpose explicitly matches this objective id or label; objective truth ownership remains undeclared."
            : status ===
                "multiple-authorities"
              ? "Multiple StateAuthorityContract declarations for this objective resolve to different authority surfaces; objective truth is split-brain."
              : "Exactly one authority surface is explicitly declared for this objective through StateAuthorityContract purpose matching.",
      };
    })
    .sort((a, b) =>
      a.objectiveId.localeCompare(
        b.objectiveId,
      )
    );
}


export function objectiveAuthorityDiagnostics(
  assessments:
    readonly ObjectiveAuthorityAssessment[],
): DiagnosticFinding[] {
  return assessments
    .flatMap((item) => {
      if (item.status === "declared") {
        return [];
      }

      return [
        createDiagnostic({
          code:
            item.status ===
              "multiple-authorities"
              ? "STATE_MULTIPLE_AUTHORITIES"
              : "STATE_AUTHORITY_UNDECLARED",
          severity:
            item.status ===
              "multiple-authorities"
              ? "medium"
              : "info",
          message:
            item.reason,
          data: {
            objectiveId:
              item.objectiveId,
            objectiveLabel:
              item.objectiveLabel,
            contractIds:
              [...item.contractIds],
            authorityKeys:
              [...item.authorityKeys],
          },
        }),
      ];
    })
    .sort((a, b) =>
      a.id.localeCompare(b.id)
    );
}
