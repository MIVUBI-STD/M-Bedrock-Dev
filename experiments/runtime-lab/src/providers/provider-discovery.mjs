import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";

async function executableExists(path) {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function runVersion(command, args = ["--version"], timeoutMs = 2500) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    child.stdout?.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", () => finish({ ok: false, output: null }));
    child.on("close", (code) => {
      const output = (stdout || stderr).trim() || null;
      finish({ ok: code === 0, output });
    });

    const timer = setTimeout(() => {
      child.kill();
      finish({ ok: false, output: null });
    }, timeoutMs);
  });
}

async function firstExecutable(candidates) {
  for (const candidate of candidates) {
    if (await executableExists(candidate)) return candidate;
  }
  return null;
}

async function detectVmware(platform) {
  if (platform === "win32") {
    const paths = [
      "C:\\Program Files (x86)\\VMware\\VMware Workstation\\vmrun.exe",
      "C:\\Program Files\\VMware\\VMware Workstation\\vmrun.exe"
    ];
    const executable = await firstExecutable(paths);
    if (!executable) return null;
    const version = await runVersion(executable, ["-T", "ws", "list"]);
    return {
      id: "vmware-workstation",
      family: "vmware",
      platform: "windows",
      executable,
      available: true,
      commandProbe: version.ok ? "PASS" : "UNKNOWN",
      versionText: null
    };
  }

  if (platform === "darwin") {
    const paths = [
      "/Applications/VMware Fusion.app/Contents/Library/vmrun"
    ];
    const executable = await firstExecutable(paths);
    if (!executable) return null;
    const version = await runVersion(executable, ["-T", "fusion", "list"]);
    return {
      id: "vmware-fusion",
      family: "vmware",
      platform: "macos",
      executable,
      available: true,
      commandProbe: version.ok ? "PASS" : "UNKNOWN",
      versionText: null
    };
  }

  return null;
}

async function detectParallels(platform) {
  if (platform !== "darwin") return null;

  const executable = await firstExecutable([
    "/usr/local/bin/prlctl",
    "/Applications/Parallels Desktop.app/Contents/MacOS/prlctl"
  ]);

  if (!executable) return null;

  const version = await runVersion(executable, ["--version"]);
  return {
    id: "parallels",
    family: "parallels",
    platform: "macos",
    executable,
    available: true,
    commandProbe: version.ok ? "PASS" : "UNKNOWN",
    versionText: version.output
  };
}

async function detectVirtualBox(platform) {
  const candidates = platform === "win32"
    ? ["C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe"]
    : platform === "darwin"
      ? ["/usr/local/bin/VBoxManage", "/Applications/VirtualBox.app/Contents/MacOS/VBoxManage"]
      : [];

  const executable = await firstExecutable(candidates);
  if (!executable) return null;

  const version = await runVersion(executable, ["--version"]);
  return {
    id: "virtualbox",
    family: "virtualbox",
    platform: platform === "win32" ? "windows" : "macos",
    executable,
    available: true,
    commandProbe: version.ok ? "PASS" : "UNKNOWN",
    versionText: version.output
  };
}

export async function discoverProviders() {
  const platform = os.platform();
  const detected = await Promise.all([
    detectVmware(platform),
    detectParallels(platform),
    detectVirtualBox(platform)
  ]);

  return detected.filter(Boolean);
}

export function selectPreferredProvider(providers) {
  const preference = process.platform === "darwin"
    ? ["vmware-fusion", "parallels", "virtualbox"]
    : ["vmware-workstation", "virtualbox"];

  for (const id of preference) {
    const match = providers.find((provider) => provider.id === id && provider.available);
    if (match) return match;
  }

  return null;
}
