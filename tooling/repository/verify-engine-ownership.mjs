import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const AREAS = [
  { root: "engine/packages", registry: "engine/packages/ownership.json" },
  { root: "engine/analyzers", registry: "engine/analyzers/ownership.json" },
  { root: "engine/adapters", registry: "engine/adapters/ownership.json" },
];

const ignoredDirectories = new Set(["node_modules", "dist", "coverage"]);
const failures = [];

for (const area of AREAS) {
  if (!existsSync(area.registry)) {
    failures.push(area.registry + ": missing ownership registry");
    continue;
  }

  const registry = JSON.parse(readFileSync(area.registry, "utf8"));
  if (registry.schemaVersion !== 1 || !registry.groups || typeof registry.groups !== "object") {
    failures.push(area.registry + ": expected schemaVersion 1 and groups object");
    continue;
  }

  const physical = readdirSync(area.root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !ignoredDirectories.has(entry.name))
    .map((entry) => entry.name)
    .sort();

  const assigned = new Map();
  for (const [groupName, group] of Object.entries(registry.groups)) {
    if (!groupName.trim() || typeof group?.purpose !== "string" || !group.purpose.trim()) {
      failures.push(area.registry + ": group " + groupName + " requires a purpose");
      continue;
    }
    if (!Array.isArray(group.modules) || group.modules.length === 0) {
      failures.push(area.registry + ": group " + groupName + " requires modules");
      continue;
    }
    for (const moduleName of group.modules) {
      if (typeof moduleName !== "string" || !moduleName.trim()) {
        failures.push(area.registry + ": group " + groupName + " has invalid module name");
        continue;
      }
      const owners = assigned.get(moduleName) ?? [];
      owners.push(groupName);
      assigned.set(moduleName, owners);
    }
  }

  for (const moduleName of physical) {
    const owners = assigned.get(moduleName) ?? [];
    if (owners.length === 0) {
      failures.push(area.registry + ": " + moduleName + " is not assigned to a domain group");
    } else if (owners.length > 1) {
      failures.push(area.registry + ": " + moduleName + " is assigned to multiple groups: " + owners.join(", "));
    }
  }

  for (const [moduleName, owners] of assigned) {
    if (!physical.includes(moduleName)) {
      failures.push(area.registry + ": stale module assignment " + moduleName + " in " + owners.join(", "));
    }
  }
}

if (failures.length > 0) {
  console.error("Engine ownership hierarchy violations:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Engine ownership hierarchy verification passed.");
