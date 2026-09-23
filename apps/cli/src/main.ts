import { resolve } from "node:path";
import { inspectArtifact } from "../../../packages/orchestrator/src/inspect-artifact.js";
import { loadKnowledgeDirectory } from "../../../packages/knowledge/src/load.js";

async function main(): Promise<void> {
  const [, , command, input] = process.argv;

  if (command !== "inspect" || !input) {
    console.error("Usage: npm run cli -- inspect <path-to-mcworld-or-zip>");
    process.exitCode = 2;
    return;
  }

  const knowledge = await loadKnowledgeDirectory(resolve("knowledge"));
  const result = await inspectArtifact(resolve(input), {}, knowledge);
  console.log(JSON.stringify(result, null, 2));

  if (result.diagnostics.some((finding) => finding.severity === "critical")) {
    process.exitCode = 1;
  }
}

await main();
