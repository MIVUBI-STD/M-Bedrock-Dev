import {
  parseRuntimeProbeResponse,
  parseRuntimeProbeTranscript,
} from "../../project-model/src/index.js";
import type {
  RuntimeProbeResponse,
  RuntimeProbeTranscript,
} from "../../project-model/src/index.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/index.js";

export interface RuntimeProbeResponseSummary {
  responses: number;
  present: number;
  absent: number;
  unknown: number;
  failed: number;
}

export interface RuntimeProbeResponseEvidence {
  records: RuntimeEvidenceRecord[];
  summary: RuntimeProbeResponseSummary;
}

export function runtimeProbeResponseEvidence(
  responses: readonly RuntimeProbeResponse[],
): RuntimeProbeResponseEvidence {
  const records: RuntimeEvidenceRecord[] = [];
  let present = 0;
  let absent = 0;
  let unknown = 0;
  let failed = 0;

  for (const raw of responses) {
    const response = parseRuntimeProbeResponse(raw);

    if (response.state === "present") present += 1;
    else if (response.state === "absent") absent += 1;
    else unknown += 1;
    if (!response.ok) failed += 1;

    records.push({
      ...response.evidence,
      origin: "runtime-probe",
      relatedNodeIds: [
        ...(response.evidence.relatedNodeIds ?? []),
        "runtime-probe-response:" + response.requestId,
        ...(response.outcomeId === undefined
          ? []
          : ["runtime-probe-outcome:" + response.outcomeId]),
      ],
      observedAt: {
        ...(response.evidence.observedAt ?? {}),
        tick: response.runtimeTick,
      },
    });
  }

  return {
    records,
    summary: {
      responses: responses.length,
      present,
      absent,
      unknown,
      failed,
    },
  };
}


export function runtimeProbeTranscriptEvidence(
  rawTranscript: RuntimeProbeTranscript,
): RuntimeProbeResponseEvidence {
  const transcript = parseRuntimeProbeTranscript(rawTranscript);
  return runtimeProbeResponseEvidence(
    transcript.exchanges.map((exchange) => exchange.response),
  );
}
