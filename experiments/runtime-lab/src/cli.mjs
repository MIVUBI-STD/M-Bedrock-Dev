#!/usr/bin/env node
import { RuntimeLabBackend } from "./runtime-lab-backend.mjs";
import { formatDoctorReport } from "./doctor.mjs";

const backend = new RuntimeLabBackend();

function usage() {
  return [
    "M-Bedrock Runtime Lab",
    "",
    "Usage:",
    "  lab doctor",
    "  lab status",
    "  lab start <1-4>",
    "  lab open <MCE-01..04>",
    "  lab reset <MCE-01..04>",
    "  lab stop [MCE-01..04]",
    "",
    "Gameplay is controlled manually by the operator."
  ].join("\n");
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function main() {
  const [, , command, arg] = process.argv;

  if (!command || ["help", "--help", "-h"].includes(command)) {
    console.log(usage());
    return;
  }

  if (command === "doctor") {
    const report = await backend.doctor();
    console.log(formatDoctorReport(report));
    if (!report.readyForProvisioning) process.exitCode = 1;
    return;
  }

  if (command === "status") {
    print(await backend.status());
    return;
  }

  if (command === "start") {
    print(await backend.start(Number(arg)));
    return;
  }

  if (command === "open") {
    print(await backend.open(arg));
    return;
  }

  if (command === "reset") {
    print(await backend.reset(arg));
    return;
  }

  if (command === "stop") {
    print(await backend.stop(arg ?? null));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error("Runtime Lab:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
