import type { OperationProgress } from "../contracts.js";

export type ProgressObserver = (progress: OperationProgress | undefined) => void;

export function isOperationProgress(value: unknown): value is OperationProgress {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const event = value as Record<string, unknown>;
  return event.schema === 1 &&
    (event.phase === "EXECUTING" || event.phase === "SUCCEEDED" || event.phase === "FAILED");
}

export function operationProgressLabel(progress: OperationProgress | undefined): string {
  if (!progress) return "Progress unavailable; waiting for the command result…";
  switch (progress.phase) {
    case "EXECUTING": return "Backend is executing the command…";
    case "SUCCEEDED": return "Backend reported success; waiting for the command result…";
    case "FAILED": return "Backend reported failure; waiting for the command result…";
  }
}
