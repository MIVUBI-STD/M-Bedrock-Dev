import { resolve } from "node:path";
import {
  runSelectedMapAudit,
  type SelectedMapAuditRuntimeTarget,
} from "../../../engine/packages/orchestrator/src/map-audit-pipeline.js";
import type {
  InspectTargetProfile,
} from "../../../engine/packages/orchestrator/src/core/types.js";
import { loadKnowledgeDirectory } from "../../../engine/packages/knowledge/src/index.js";
import { parseCliTargetOptions } from "./target-options.js";

function runtimeTarget(
  target: InspectTargetProfile,
): SelectedMapAuditRuntimeTarget {
  return {
    ...(target.edition === undefined ? {} : { edition: target.edition }),
    ...(target.version === undefined ? {} : { version: target.version }),
    ...(target.educationFeatures === undefined ? {} : { educationFeatures: target.educationFeatures }),
    ...(target.eduLevel === undefined ? {} : { eduLevel: target.eduLevel }),
    ...(target.experiments === undefined ? {} : { experiments: target.experiments }),
    ...(target.arenaProofMode === undefined ? {} : { arenaProofMode: target.arenaProofMode }),
    ...(target.staticExecutionDimension === undefined ? {} : { staticExecutionDimension: target.staticExecutionDimension }),
  };
}

async function main(): Promise<void> {
  const { positionals, target, telemetryPath, arenaRegionContractsPath } =
    parseCliTargetOptions(process.argv.slice(2));
  const [input] = positionals;
  if (!input) {
    throw new Error("Usage: audit <selected.mcworld> [target options]");
  }
  if (telemetryPath !== undefined || arenaRegionContractsPath !== undefined) {
    throw new Error(
      "Production audit CLI accepts only the selected artifact and runtime/platform target options.",
    );
  }
  if ((target.contractSourceRoots?.length ?? 0) > 0) {
    throw new Error(
      "Production audit cannot accept external contract source roots.",
    );
  }

  const knowledge = await loadKnowledgeDirectory(resolve("engine/knowledge"));
  const audit = await runSelectedMapAudit({
    artifactPath: resolve(input),
    target: runtimeTarget(target),
    knowledgeCatalog: knowledge,
    telemetry: [],
  });
  process.stdout.write(JSON.stringify(audit.mapAuditReport, null, 2) + "\n");
  if (audit.mapAuditReport.control.status === "BLOCKED") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
