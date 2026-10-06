import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";

export function analyzeCinematicControl(
  scripts: readonly ParsedScriptFile[],
) {
  const calls = scripts.flatMap((script) =>
    script.methodCalls.map((call) => ({ scriptId: script.identifier, ...call }))
  );
  const cameraCalls = calls.filter((call) =>
    ["setCamera", "clear", "fade"].includes(call.method) &&
    /camera/i.test(call.receiverHint ?? call.symbol)
  );
  const cameraSetCalls = cameraCalls.filter((call) => call.method === "setCamera");
  const cameraClearCalls = cameraCalls.filter((call) => call.method === "clear");
  const fadeCalls = cameraCalls.filter((call) => call.method === "fade");
  const inputWrites = scripts.flatMap((script) =>
    script.cleanupResourceEvidence.filter((item) => item.surface === "input-permission")
      .map((item) => ({ scriptId: script.identifier, ...item }))
  );
  const inputLocks = inputWrites.filter((item) => item.action === "acquire");
  const inputRestores = inputWrites.filter((item) => item.action === "release");
  const cameraRegions = new Set(cameraSetCalls.map((call) => call.executionRegion ?? "module"));
  const coordinatedRegions = [...cameraRegions].filter((region) =>
    inputLocks.some((item) => item.executionRegion === region)
  );
  return {
    cameraSetCalls: cameraSetCalls.length,
    cameraClearCalls: cameraClearCalls.length,
    fadeCalls: fadeCalls.length,
    inputLocks: inputLocks.length,
    inputRestores: inputRestores.length,
    coordinatedRegions: coordinatedRegions.length,
    cameraCleanupStatus:
      cameraSetCalls.length === 0
        ? "not-applicable" as const
        : cameraClearCalls.length > 0
          ? "clear-surface-present" as const
          : "clear-surface-missing" as const,
    controlCoordinationStatus:
      cameraSetCalls.length === 0
        ? "not-applicable" as const
        : coordinatedRegions.length > 0
          ? "coordinated-surface-present" as const
          : "unresolved" as const,
    runtimeCompletionStatus:
      cameraSetCalls.length > 0 || fadeCalls.length > 0
        ? "runtime-verification-required" as const
        : "not-applicable" as const,
  };
}
