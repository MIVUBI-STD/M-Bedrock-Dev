import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";
import type { SourceRef } from "../../../project-model/src/index.js";

export type ClientPredictedMutationKind =
  | "liquid-or-waterlog"
  | "block-place"
  | "block-break"
  | "block-interaction"
  | "item-use-on"
  | "unknown";

export interface ClientMutationCancellation {
  scriptId: string;
  event: string;
  executionRegion: string;
  kind: ClientPredictedMutationKind;
  source: SourceRef;
}

export interface ClientMutationReconciliationAnalysis {
  cancellations: readonly ClientMutationCancellation[];
  predictedMutationCancellations: number;
  liquidOrWaterlogCancellations: number;
  blockPlaceCancellations: number;
  blockBreakCancellations: number;
  interactionCancellations: number;
}

function kindForEvent(event: string): ClientPredictedMutationKind {
  const normalized = event.toLowerCase();
  if (
    normalized.includes("itemuseon") ||
    normalized.includes("itemuse")
  ) {
    return "item-use-on";
  }
  if (normalized.includes("placeblock")) {
    return "block-place";
  }
  if (normalized.includes("breakblock")) {
    return "block-break";
  }
  if (normalized.includes("interactwithblock")) {
    return "block-interaction";
  }
  return "unknown";
}

function sourceTextForRegion(
  text: string,
  source: SourceRef,
): string {
  const lines = text.split(/\r?\n/);
  const start = Math.max(
    0,
    (source.range?.lineStart ?? 1) - 1,
  );
  const end = Math.min(
    lines.length,
    source.range?.lineEnd ?? lines.length,
  );
  return lines.slice(start, end).join("\n");
}

export function analyzeClientMutationReconciliation(
  scripts: readonly {
    parsed: ParsedScriptFile;
    text?: string;
  }[],
): ClientMutationReconciliationAnalysis {
  const cancellations: ClientMutationCancellation[] = [];

  for (const item of scripts) {
    const text = item.text ?? "";
    for (const event of item.parsed.events) {
      if (event.phase !== "beforeEvents") continue;
      const kind = kindForEvent(event.event);
      if (kind === "unknown") continue;

      const callbackSource =
        event.callbackSource ?? event.source;
      const regionText =
        sourceTextForRegion(text, callbackSource);
      const hasCancel =
        /\.cancel\s*=\s*true\b/.test(regionText);
      if (!hasCancel) continue;

      const liquidHint =
        /water|bucket|waterlog|lava|liquid/i.test(regionText);

      cancellations.push({
        scriptId: item.parsed.identifier,
        event: event.event,
        executionRegion:
          event.callbackRegion ??
          event.executionRegion ??
          "callback",
        kind:
          liquidHint
            ? "liquid-or-waterlog"
            : kind,
        source: callbackSource,
      });
    }
  }

  const unique = cancellations.filter(
    (item, index, all) =>
      all.findIndex((candidate) =>
        candidate.scriptId === item.scriptId &&
        candidate.event === item.event &&
        candidate.executionRegion ===
          item.executionRegion &&
        candidate.kind === item.kind
      ) === index,
  );

  return {
    cancellations: unique,
    predictedMutationCancellations: unique.length,
    liquidOrWaterlogCancellations:
      unique.filter(
        (item) =>
          item.kind === "liquid-or-waterlog",
      ).length,
    blockPlaceCancellations:
      unique.filter(
        (item) => item.kind === "block-place",
      ).length,
    blockBreakCancellations:
      unique.filter(
        (item) => item.kind === "block-break",
      ).length,
    interactionCancellations:
      unique.filter(
        (item) =>
          item.kind === "block-interaction" ||
          item.kind === "item-use-on",
      ).length,
  };
}
