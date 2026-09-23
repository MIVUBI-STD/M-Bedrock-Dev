import { resolve } from "node:path";
import { compareArtifacts } from "../../../packages/orchestrator/src/compare-artifacts.js";
import { compareArtifactsForUpdate } from "../../../packages/orchestrator/src/version-aware-comparison.js";
import { inspectArtifact } from "../../../packages/orchestrator/src/inspect-artifact.js";
import { loadKnowledgeDirectory } from "../../../packages/knowledge/src/load.js";
import { aggregateScriptApiUsage } from "../../../packages/orchestrator/src/script-api-usage.js";
import { parseCliTargetOptions } from "./target-options.js";

async function main(): Promise<void> {
  const [, , command, ...rawArgs] = process.argv;
  const { positionals: args, target } = parseCliTargetOptions(rawArgs);
  const [input, secondInput, thirdInput] = args;
  const knowledge = await loadKnowledgeDirectory(resolve("knowledge"));

  if (command === "inspect" && input) {
    const result = await inspectArtifact(resolve(input), target, knowledge);
    console.log(JSON.stringify(result, null, 2));

    if (result.diagnostics.some((finding) => finding.severity === "critical")) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "script-usage" && args.length > 0) {
    const maps = [];
    for (const artifactPath of args) {
      const result = await inspectArtifact(resolve(artifactPath), target, knowledge);
      maps.push({
        mapId: result.artifactId,
        label: artifactPath,
        usage: result.scriptApiUsage,
      });
    }
    console.log(JSON.stringify(aggregateScriptApiUsage(maps), null, 2));
    return;
  }

  if (command === "compare-update" && input && secondInput && thirdInput) {
    const result = await compareArtifactsForUpdate(
      resolve(input),
      resolve(secondInput),
      thirdInput,
      resolve("reliability/catalogs"),
      target,
      knowledge,
    );
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "compare" && input && secondInput) {
    const result = await compareArtifacts(
      resolve(input),
      resolve(secondInput),
      target,
      knowledge,
    );
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error([
    "Usage:",
    "  npm run cli -- inspect <path-to-mcworld-or-zip> [--edition bedrock|education] [--version x.y.z] [--experiment id]",
    "  npm run cli -- script-usage <map1.mcworld> [map2.mcworld ...] [--edition ...] [--version ...]",
    "  npm run cli -- compare <before-mcworld> <after-mcworld> [--edition ...] [--version ...]",
    "  npm run cli -- compare-update <before-mcworld> <after-mcworld> <target-version> [--edition ...] [--experiment id]",
  ].join("\n"));
  process.exitCode = 2;
}

await main();
