import { resolve } from "node:path";
import { compareArtifacts } from "../../../packages/orchestrator/src/compare-artifacts.js";
import { compareArtifactsForUpdate } from "../../../packages/orchestrator/src/version-aware-comparison.js";
import { inspectArtifact } from "../../../packages/orchestrator/src/inspect-artifact.js";
import { loadKnowledgeDirectory } from "../../../packages/knowledge/src/load.js";

async function main(): Promise<void> {
  const [, , command, input, secondInput, thirdInput] = process.argv;
  const knowledge = await loadKnowledgeDirectory(resolve("knowledge"));

  if (command === "inspect" && input) {
    const result = await inspectArtifact(resolve(input), {}, knowledge);
    console.log(JSON.stringify(result, null, 2));

    if (result.diagnostics.some((finding) => finding.severity === "critical")) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "compare-update" && input && secondInput && thirdInput) {
    const result = await compareArtifactsForUpdate(
      resolve(input),
      resolve(secondInput),
      thirdInput,
      resolve("reliability/catalogs"),
      {},
      knowledge,
    );
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "compare" && input && secondInput) {
    const result = await compareArtifacts(
      resolve(input),
      resolve(secondInput),
      {},
      knowledge,
    );
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error([
    "Usage:",
    "  npm run cli -- inspect <path-to-mcworld-or-zip>",
    "  npm run cli -- compare <before-mcworld> <after-mcworld>",
    "  npm run cli -- compare-update <before-mcworld> <after-mcworld> <target-version>",
  ].join("\n"));
  process.exitCode = 2;
}

await main();
