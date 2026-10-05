#!/usr/bin/env node
import { formatDoctorReport, runDoctor } from "./doctor.mjs";

function usage() {
  return [
    "M-Bedrock Runtime Lab",
    "",
    "Usage:",
    "  node experiments/runtime-lab/src/cli.mjs doctor [--json]",
    "",
    "Current phase:",
    "  doctor   inspect host capability and provider availability"
  ].join("\n");
}

async function main() {
  const [, , command, ...args] = process.argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }

  if (command !== "doctor") {
    console.error(`Unknown command: ${command}\n\n${usage()}`);
    process.exitCode = 2;
    return;
  }

  const report = await runDoctor();
  if (args.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatDoctorReport(report));
  }

  if (!report.readyForProvisioning) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Runtime Lab doctor failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
