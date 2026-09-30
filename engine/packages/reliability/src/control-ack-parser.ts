import type { RuntimeControlAction } from "./runtime-control.js";

export const RUNTIME_CONTROL_ACK_PREFIX = "[M-BEDROCK-CTRL-ACK]";

export interface RuntimeControlAck {
  scenarioId: string;
  runtimeTick: number;
  requestedTick: number;
  ok: boolean;
  action: RuntimeControlAction;
  error?: string;
}

export interface ParsedControlAckLog {
  acknowledgements: RuntimeControlAck[];
  malformed: Array<{
    line: number;
    content: string;
    reason: string;
  }>;
}

export function parseRuntimeControlAckLog(
  text: string,
  prefix = RUNTIME_CONTROL_ACK_PREFIX,
): ParsedControlAckLog {
  const acknowledgements: RuntimeControlAck[] = [];
  const malformed: ParsedControlAckLog["malformed"] = [];

  text.split(/\r?\n/).forEach((line, index) => {
    const marker = line.indexOf(prefix);
    if (marker < 0) return;

    const payload = line.slice(marker + prefix.length).trim();
    if (!payload) {
      malformed.push({
        line: index + 1,
        content: line,
        reason: "Control acknowledgement has no JSON payload.",
      });
      return;
    }

    try {
      const parsed = JSON.parse(payload) as RuntimeControlAck;
      if (
        !parsed ||
        typeof parsed !== "object" ||
        typeof parsed.scenarioId !== "string" ||
        typeof parsed.runtimeTick !== "number" ||
        typeof parsed.requestedTick !== "number" ||
        typeof parsed.ok !== "boolean" ||
        !parsed.action ||
        typeof parsed.action !== "object"
      ) {
        malformed.push({
          line: index + 1,
          content: line,
          reason: "Control acknowledgement does not match the expected shape.",
        });
        return;
      }
      acknowledgements.push(parsed);
    } catch (error) {
      malformed.push({
        line: index + 1,
        content: line,
        reason: error instanceof Error ? error.message : "Invalid JSON.",
      });
    }
  });

  return { acknowledgements, malformed };
}
