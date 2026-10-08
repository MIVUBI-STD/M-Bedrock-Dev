import { readFileSync } from "node:fs";

const profiles = JSON.parse(
  readFileSync(".agents/permissions/lane-permissions.json", "utf8"),
).profiles;
const access = JSON.parse(
  readFileSync(".agents/permissions/path-access.json", "utf8"),
).rules;

const laneColumns = {
  "m-bedrock-map-bug-audit": "audit",
  "m-bedrock-detection-development": "detectionDevelopment",
  "m-bedrock-detection-benchmark": "benchmark",
  "m-bedrock-target-repair": "targetRepair",
  "product-development": "productDevelopment",
};

function globToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^$(){}|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "<<<ALL>>>")
    .replace(/\*/g, "[^/]*")
    .replace(/<<<ALL>>>/g, ".*");
  return new RegExp("^" + escaped + "$");
}

function pathDecision(lane, path, mode) {
  const column = laneColumns[lane];
  if (!column) return { decision: "deny", reason: "Unknown work lane." };

  const matches = access.filter((rule) => globToRegex(rule.path).test(path));
  if (matches.length === 0) {
    return {
      decision: mode === "read" ? "ask" : "deny",
      reason: "No path-access rule covers this path.",
    };
  }

  const grants = matches.map((rule) => rule[column]).filter(Boolean);
  if (mode === "read") {
    return grants.some((grant) => grant === "read" || grant === "read-write")
      ? { decision: "allow", reason: "Path is readable in active lane." }
      : { decision: "deny", reason: "Path is not readable in active lane." };
  }

  return grants.some((grant) => grant === "read-write")
    ? { decision: "allow", reason: "Path is writable in active lane." }
    : { decision: "deny", reason: "Path is not writable in active lane." };
}

export function evaluateLanePermission(request) {
  const profile = profiles[request.lane];
  if (!profile) {
    return { decision: "deny", reason: "Unknown lane permission profile." };
  }

  if (profile.never?.includes(request.action)) {
    return { decision: "deny", reason: "Action is explicitly forbidden by lane profile." };
  }

  if (profile.askBefore?.includes(request.action)) {
    return { decision: "ask", reason: "Action requires explicit approval in lane profile." };
  }

  if (request.path) {
    const pathResult = pathDecision(
      request.lane,
      request.path,
      request.mode ?? "read",
    );
    if (pathResult.decision !== "allow") return pathResult;
  }

  if (request.resource && request.mode) {
    const resource = profile[request.resource];
    if (resource && typeof resource === "object") {
      if (request.mode === "read" && resource.read !== true) {
        return { decision: "deny", reason: "Resource read is disabled in lane profile." };
      }
      if (request.mode === "write" && resource.write !== true) {
        return { decision: "deny", reason: "Resource write is disabled in lane profile." };
      }
    }
  }

  if (request.resource === "network") {
    if (profile.network === "off-by-default") {
      return { decision: "ask", reason: "Network is off by default for this lane." };
    }
  }

  return { decision: "allow", reason: "Request satisfies lane permission contract." };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: node evaluate-lane-permission.mjs <request.json>");
  const request = JSON.parse(readFileSync(path, "utf8"));
  process.stdout.write(JSON.stringify(evaluateLanePermission(request), null, 2) + "\n");
}
