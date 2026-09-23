import { createHash } from "node:crypto";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type { EntityTransitionReachability } from "../../entities/src/reachability.js";

function idFor(source: SourceRef, suffix: string): string {
  return "diag_" + createHash("sha256")
    .update(`${source.artifactId}:${source.relativePath}:${suffix}`)
    .digest("hex")
    .slice(0, 16);
}

export function entityTransitionDiagnostics(
  reachability: EntityTransitionReachability,
  source: SourceRef,
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];

  for (const event of reachability.undefinedSensorEvents) {
    findings.push({
      id: idFor(source, `undefined-sensor-event:${event}`),
      code: "ENTITY_SENSOR_EVENT_UNDEFINED",
      severity: "medium",
      message: `Entity sensor references undefined event ${event}.`,
      source,
      data: { event, provenance: "entity-sensor" },
    });
  }

  for (const event of reachability.undefinedTriggeredEvents) {
    findings.push({
      id: idFor(source, `undefined-trigger-event:${event}`),
      code: "ENTITY_TRIGGER_EVENT_UNDEFINED",
      severity: "medium",
      message: `Entity event chain references undefined event ${event}.`,
      source,
      data: { event, provenance: "entity-event-trigger" },
    });
  }

  for (const item of reachability.missingComponentGroups) {
    findings.push({
      id: idFor(source, `missing-group:${item.event}:${item.operation}:${item.group}`),
      code: "ENTITY_EVENT_COMPONENT_GROUP_UNDEFINED",
      severity: "medium",
      message: `Entity event ${item.event} tries to ${item.operation} undefined component group ${item.group}.`,
      source,
      data: item,
    });
  }

  for (const event of reachability.internallyUnreachedEvents) {
    findings.push({
      id: idFor(source, `internal-unreached:${event}`),
      code: "ENTITY_EVENT_INTERNAL_REACHABILITY_UNKNOWN",
      severity: "info",
      message: `Entity event ${event} is not reachable from configured sensor/event roots; it may still be triggered externally.`,
      source,
      data: {
        event,
        limitation: "command/animation/engine/external trigger may exist",
      },
    });
  }

  return findings;
}
