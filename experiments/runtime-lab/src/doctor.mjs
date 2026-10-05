import os from "node:os";
import { discoverProviders, selectPreferredProvider } from "./providers/provider-discovery.mjs";

const GIB = 1024 ** 3;

function status(condition, failure = "FAIL") {
  return condition ? "PASS" : failure;
}

function normalizePlatform(platform) {
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "macos";
  return "unsupported";
}

export async function runDoctor() {
  const platform = normalizePlatform(os.platform());
  const totalMemoryGb = os.totalmem() / GIB;
  const freeMemoryGb = os.freemem() / GIB;
  const cpuCount = os.cpus().length;
  const providers = await discoverProviders();
  const preferredProvider = selectPreferredProvider(providers);

  const checks = {
    platform: {
      status: status(platform === "windows" || platform === "macos"),
      value: platform
    },
    cpu: {
      status: status(cpuCount >= 8, "WARN"),
      logicalCpus: cpuCount,
      recommendedMinimum: 8
    },
    memory: {
      status: status(totalMemoryGb >= 32, totalMemoryGb >= 16 ? "WARN" : "FAIL"),
      totalGb: Number(totalMemoryGb.toFixed(1)),
      freeGb: Number(freeMemoryGb.toFixed(1)),
      recommendedMinimumGb: 32
    },
    virtualization: {
      status: "UNKNOWN",
      reason: "Portable host virtualization capability probe is not implemented yet."
    },
    graphics: {
      status: "UNKNOWN",
      reason: "GPU acceleration must be validated by an interactive client probe."
    },
    provider: {
      status: preferredProvider ? "PASS" : "FAIL",
      selected: preferredProvider?.id ?? null,
      detected: providers
    }
  };

  const blocking = Object.entries(checks)
    .filter(([, value]) => value.status === "FAIL")
    .map(([name]) => name);

  return {
    schemaVersion: 1,
    command: "doctor",
    platform,
    host: {
      hostname: os.hostname(),
      release: os.release(),
      architecture: os.arch()
    },
    checks,
    readyForProvisioning: blocking.length === 0 && preferredProvider !== null,
    blocking
  };
}

export function formatDoctorReport(report) {
  const lines = [
    "M-Bedrock Runtime Lab",
    "",
    `Platform             ${report.platform}`,
    `Provider             ${report.checks.provider.selected ?? "none"}`,
    `Provider Status      ${report.checks.provider.status}`,
    "",
    `CPU                   ${report.checks.cpu.status} (${report.checks.cpu.logicalCpus} logical CPUs)`,
    `Memory                ${report.checks.memory.status} (${report.checks.memory.totalGb} GB total / ${report.checks.memory.freeGb} GB free)`,
    `Virtualization        ${report.checks.virtualization.status}`,
    `Graphics              ${report.checks.graphics.status}`,
    "",
    `Runtime Lab           ${report.readyForProvisioning ? "READY FOR PROVISIONING" : "NOT READY"}`
  ];

  if (report.blocking.length > 0) {
    lines.push("", `Blocking: ${report.blocking.join(", ")}`);
  }

  return lines.join("\n");
}
