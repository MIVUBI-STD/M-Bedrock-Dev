import type {
  TelemetryBatch,
  TelemetryEvent,
} from "../../project-model/src/telemetry.js";
import type {
  RuntimeEvidenceRecord,
  RuntimeScope,
} from "../../project-model/src/runtime-evidence.js";

function base(
  event: TelemetryEvent,
  predicate: string,
  state: RuntimeEvidenceRecord["state"] = "present",
  note?: string,
): RuntimeEvidenceRecord {
  return {
    predicate,
    state,
    confidence: "observed",
    scope: event.scope,
    relatedNodeIds: ["telemetry:" + event.eventId],
    ...(event.sourceRefs === undefined ? {} : { sourceRefs: event.sourceRefs }),
    ...(note ?? event.note
      ? { note: note ?? event.note }
      : {}),
  };
}

function ensureEntityScope(
  scope: RuntimeScope,
  entityKey: string | undefined,
): RuntimeScope {
  return entityKey && scope.entityKey === undefined
    ? { ...scope, entityKey }
    : scope;
}

function ensurePlayerScope(
  scope: RuntimeScope,
  playerKey: string | undefined,
): RuntimeScope {
  return playerKey && scope.playerKey === undefined
    ? { ...scope, playerKey }
    : scope;
}

function recordsForEvent(event: TelemetryEvent): RuntimeEvidenceRecord[] {
  switch (event.kind) {
    case "entity-stall": {
      const scoped = {
        ...event,
        scope: ensureEntityScope(event.scope, event.entityKey),
      };
      return [
        base(scoped, "entity-stall-observed", "present", event.routeId),
        base(scoped, "navigation-stall-observed", "present", [
          event.routeId ? "route=" + event.routeId : undefined,
          event.stalledTicks === undefined
            ? undefined
            : "stalledTicks=" + event.stalledTicks,
          event.distanceDelta === undefined
            ? undefined
            : "distanceDelta=" + event.distanceDelta,
        ].filter(Boolean).join(";")),
      ];
    }

    case "teleport-fallback": {
      const entityScoped = ensureEntityScope(event.scope, event.entityKey);
      const scoped = {
        ...event,
        scope: ensurePlayerScope(entityScoped, event.playerKey),
      };
      return [
        base(scoped, "teleport-fallback-observed", "present", event.reason),
      ];
    }

    case "arena-double-start": {
      const scoped = {
        ...event,
        scope: {
          ...event.scope,
          arenaId: event.arenaId,
          arenaGeneration: event.arenaGeneration,
        },
      };
      return [
        base(scoped, "arena-start-observed"),
        base(
          scoped,
          "single-start-transaction-owner",
          "absent",
          event.startOperationIds?.join(","),
        ),
        base(scoped, "arena-double-start-observed"),
      ];
    }

    case "stale-callback":
      return [
        base(event, "deferred-callback-executed", "present", event.subsystem),
        base(
          event,
          "current-generation-callback",
          "absent",
          [
            event.callbackKind,
            event.capturedGeneration === undefined
              ? undefined
              : "captured=" + event.capturedGeneration,
            event.currentGeneration === undefined
              ? undefined
              : "current=" + event.currentGeneration,
          ].filter(Boolean).join(";"),
        ),
        base(event, "stale-callback-observed", "present", event.subsystem),
      ];

    case "revive-anomaly": {
      const targetScope = ensurePlayerScope(
        event.scope,
        event.targetPlayerKey,
      );
      const scoped = { ...event, scope: targetScope };
      return [
        base(scoped, "revive-completion-observed", "present", event.anomaly),
        base(scoped, "valid-revive-transaction", "absent", event.anomaly),
        base(scoped, "revive-anomaly-observed", "present", event.anomaly),
        base(scoped, "revive-anomaly:" + event.anomaly),
      ];
    }

    case "state-drift":
      return [
        base(event, "state-authority-observed"),
        base(event, "state-mirror-observed"),
        base(
          event,
          "state-mirror-consistent",
          "absent",
          event.contractId,
        ),
        base(event, "state-drift-observed", "present", event.contractId),
      ];

    case "route-revalidation":
      return [
        base(
          event,
          "route-revalidation",
          event.result === "passed" ? "present" : "absent",
          event.routeId + ":" + event.result,
        ),
        base(
          event,
          event.result === "passed"
            ? "route-revalidation-passed"
            : "route-revalidation-failed",
        ),
      ];

    case "mutation-verification": {
      const records: RuntimeEvidenceRecord[] = [
        base(
          event,
          "post-placement-readiness-verification",
          event.result === "passed" ? "present" : "absent",
          event.mechanism,
        ),
        base(
          event,
          event.result === "passed"
            ? "mutation-verification-passed"
            : "mutation-verification-failed",
        ),
      ];
      return records;
    }
  }
}

export function telemetryRuntimeEvidence(
  events: readonly TelemetryEvent[],
): RuntimeEvidenceRecord[] {
  return events.flatMap(recordsForEvent);
}

export function telemetryBatchRuntimeEvidence(
  batch: TelemetryBatch,
): RuntimeEvidenceRecord[] {
  return telemetryRuntimeEvidence(batch.events);
}
