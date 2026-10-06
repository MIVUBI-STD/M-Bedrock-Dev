import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";

export function analyzeScriptPerformanceSurfaces(
  scripts: readonly ParsedScriptFile[],
) {
  const calls = scripts.flatMap((script) =>
    script.methodCalls.map((call) => ({ scriptId: script.identifier, ...call }))
  );
  const intervals = calls.filter((call) => call.method === "runInterval");
  const entityQueries = calls.filter((call) => call.method === "getEntities");
  const jobs = calls.filter((call) => call.method === "runJob");
  const intervalRegions = new Set(intervals.map((call) => call.executionRegion ?? "module"));
  const recurringQueryCandidates = entityQueries.filter((call) =>
    intervalRegions.has(call.executionRegion ?? "module")
  );
  return {
    runIntervalCalls: intervals.length,
    getEntitiesCalls: entityQueries.length,
    runJobCalls: jobs.length,
    recurringQueryCandidates: recurringQueryCandidates.length,
    runtimeMeasurementRequired:
      intervals.length > 0 || entityQueries.length > 0 || jobs.length > 0,
  };
}
