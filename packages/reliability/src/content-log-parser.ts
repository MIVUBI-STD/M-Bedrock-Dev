import type { RuntimeObservationSnapshot } from "./runtime-observation.js";

export const RUNTIME_OBSERVATION_LOG_PREFIX = "[M-BEDROCK-OBS]";

export interface ParsedObservationLog {
  snapshots: RuntimeObservationSnapshot[];
  malformed: Array<{
    line: number;
    content: string;
    reason: string;
  }>;
}

export function parseRuntimeObservationLog(
  text: string,
  prefix = RUNTIME_OBSERVATION_LOG_PREFIX,
): ParsedObservationLog {
  const snapshots: RuntimeObservationSnapshot[] = [];
  const malformed: ParsedObservationLog["malformed"] = [];

  text.split(/\r?\n/).forEach((line, index) => {
    const marker = line.indexOf(prefix);
    if (marker < 0) return;

    const payload = line.slice(marker + prefix.length).trim();
    if (!payload) {
      malformed.push({
        line: index + 1,
        content: line,
        reason: "Observation log record has no JSON payload.",
      });
      return;
    }

    try {
      const parsed = JSON.parse(payload) as RuntimeObservationSnapshot;
      if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.players) || !Array.isArray(parsed.arenas)) {
        malformed.push({
          line: index + 1,
          content: line,
          reason: "Observation payload does not match schemaVersion 1 shape.",
        });
        return;
      }
      snapshots.push(parsed);
    } catch (error) {
      malformed.push({
        line: index + 1,
        content: line,
        reason: error instanceof Error ? error.message : "Invalid JSON.",
      });
    }
  });

  return { snapshots, malformed };
}
