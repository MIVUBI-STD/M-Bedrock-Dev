#!/usr/bin/env node
import { RuntimeLabBackend } from "./runtime-lab-backend.mjs";
import { formatDoctorReport } from "./doctor.mjs";

const backend = new RuntimeLabBackend();

function usage() {
  return [
    "M-Bedrock Runtime Lab",
    "",
    "Usage:",
    "  node experiments/runtime-lab/src/cli.mjs doctor [--json]",
    "  node experiments/runtime-lab/src/cli.mjs status [--json]",
    "  node experiments/runtime-lab/src/cli.mjs plan <scenario> [--json]",
    "",
    "Backend lifecycle commands will be enabled only after their owners are implemented."
  ].join("\n");
}

function print(value, json) {
  if (json) console.log(JSON.stringify(value, null, 2));
  else console.log(JSON.stringify(value, null, 2));
}

async function main() {
  const [, , command, ...args] = process.argv;
  const json = args.includes("--json");
  const positional = args.filter((arg) => arg !== "--json");

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }

  if (command === "doctor") {
    const report = await backend.doctor();
    console.log(json ? JSON.stringify(report, null, 2) : formatDoctorReport(report));
    if (!report.readyForProvisioning) process.exitCode = 1;
    return;
  }

  if (command === "status") {
    print(await backend.status(), json);
    return;
  }

  if (command === "plan") {
    const scenario = positional[0];
    if (!scenario) throw new Error("Scenario id is required.");
    print(await backend.planScenario(scenario), json);
    return;
  }

  console.error(`Unknown command: ${command}\n\n${usage()}`);
  process.exitCode = 2;
}

main().catch((error) => {
  console.error("Runtime Lab:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
