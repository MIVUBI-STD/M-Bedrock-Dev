import type { OperationProgress } from "../contracts.js";

export type ProgressObserver = (progress: OperationProgress | undefined) => void;

const activeOperationLabels: Readonly<Record<string, string>> = {
  "support-bundle": "Creating support bundle…",
  "stage-update": "Preparing application update…",
  "register-base": "Checking the Base client…",
  "open-base-finalization": "Opening Base setup…",
  provision: "Creating virtual clients…",
  "verify-identities": "Checking virtual client identities…",
  start: "Starting virtual clients…",
  "start-setup": "Opening first-time setup…",
  "start-client": "Starting virtual client…",
  suspend: "Pausing virtual client…",
  stop: "Stopping virtual client…",
  restart: "Restarting virtual client…",
  "set-ready": "Saving recovery point…",
  reset: "Restoring recovery point…",
  open: "Opening virtual client…",
  reprovision: "Recreating virtual client…",
};

export function isOperationProgress(value: unknown): value is OperationProgress {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const event = value as Record<string, unknown>;
  return event.schema === 2 &&
    typeof event.operation === "string" &&
    event.operation.length > 0 &&
    (event.phase === "EXECUTING" || event.phase === "SUCCEEDED" || event.phase === "FAILED");
}

export function operationProgressLabel(progress: OperationProgress | undefined): string {
  if (!progress) return "Waiting for the current operation…";
  switch (progress.phase) {
    case "EXECUTING":
      return activeOperationLabels[progress.operation] ?? "Working…";
    case "SUCCEEDED":
      return "Finishing and checking current state…";
    case "FAILED":
      return "The operation stopped; checking current state…";
  }
}
