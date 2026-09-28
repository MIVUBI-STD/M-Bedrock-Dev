import type {
  RuntimeEvidenceRecord,
} from "../../project-model/src/index.js";

export const BEDROCK_ACTION_PREFIX =
  "[M-BEDROCK-ACTION]";

export interface BedrockRuntimeActionRequest {
  schemaVersion: 1;
  requestId: string;
  actionId: string;
  parameters: Readonly<
    Record<string, string | number | boolean>
  >;
}

export interface BedrockRuntimeActionResponse {
  schemaVersion: 1;
  requestId: string;
  actionId: string;
  runtimeTick: number;
  ok: boolean;
  evidence?: readonly RuntimeEvidenceRecord[];
  error?: string;
}

export function parseBedrockRuntimeActionResponse(
  value: string,
): BedrockRuntimeActionResponse {
  const parsed = JSON.parse(value) as Partial<
    BedrockRuntimeActionResponse
  >;
  if (parsed.schemaVersion !== 1) {
    throw new Error(
      "Bedrock runtime action response schemaVersion must be 1.",
    );
  }
  if (
    typeof parsed.requestId !== "string" ||
    !parsed.requestId.trim()
  ) {
    throw new Error(
      "Bedrock runtime action response requestId is required.",
    );
  }
  if (
    typeof parsed.actionId !== "string" ||
    !parsed.actionId.trim()
  ) {
    throw new Error(
      "Bedrock runtime action response actionId is required.",
    );
  }
  if (
    typeof parsed.runtimeTick !== "number" ||
    !Number.isFinite(parsed.runtimeTick)
  ) {
    throw new Error(
      "Bedrock runtime action response runtimeTick must be finite.",
    );
  }
  if (typeof parsed.ok !== "boolean") {
    throw new Error(
      "Bedrock runtime action response ok must be boolean.",
    );
  }
  if (
    parsed.error !== undefined &&
    typeof parsed.error !== "string"
  ) {
    throw new Error(
      "Bedrock runtime action response error must be a string when provided.",
    );
  }
  if (parsed.evidence !== undefined) {
    if (!Array.isArray(parsed.evidence)) {
      throw new Error(
        "Bedrock runtime action response evidence must be an array when provided.",
      );
    }
    for (const [index, record] of parsed.evidence.entries()) {
      if (
        typeof record !== "object" ||
        record === null ||
        typeof (record as RuntimeEvidenceRecord).predicate !== "string" ||
        !["present", "absent", "unknown"].includes(
          String((record as RuntimeEvidenceRecord).state),
        ) ||
        !["observed", "derived", "unknown"].includes(
          String((record as RuntimeEvidenceRecord).confidence),
        )
      ) {
        throw new Error(
          "Bedrock runtime action response evidence[" +
            index +
            "] is invalid.",
        );
      }
    }
  }
  return parsed as BedrockRuntimeActionResponse;
}
