import type { LiveRegressionIncidentBundle } from "./live-regression-runner.js";

export function serializeIncidentBundle(
  incident: LiveRegressionIncidentBundle,
): string {
  return JSON.stringify(incident, null, 2) + "\n";
}

export function incidentFilename(
  incident: LiveRegressionIncidentBundle,
): string {
  const safeScenario = incident.scenarioId.replace(/[^A-Za-z0-9._-]+/g, "_");
  return `${safeScenario}-tick-${incident.firstDivergenceTick}.incident.json`;
}
