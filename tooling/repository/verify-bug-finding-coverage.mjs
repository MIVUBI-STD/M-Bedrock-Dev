import { existsSync, readFileSync } from "node:fs";

const failures = [];
const canonical = "docs/03-analysis/bug-finding-coverage.md";
const compatibility = [
  "docs/03-analysis/detection-coverage-assurance.md",
  "docs/03-analysis/gameplay-audit-blind-spots.md",
  "docs/03-analysis/cross-system-interaction-audit.md",
  "docs/03-analysis/audit-finalization-checklist.md",
];

if (!existsSync(canonical)) {
  failures.push("Missing canonical bug-finding coverage owner: " + canonical);
} else {
  const text = readFileSync(canonical, "utf8");
  const requiredSections = [
    "Surface accounting",
    "Player-flow coverage",
    "Vital-domain coverage",
    "Cross-system stress",
    "Final conservation gate",
    "Anti-forgetting rule",
  ];
  for (const section of requiredSections) {
    if (!text.includes(section)) {
      failures.push("Canonical coverage missing required section: " + section);
    }
  }
  for (const requiredTerm of [
    "engine/reliability/catalogs/knowledge-detector-bindings.json",
    "PROVEN",
    "NEED_VALIDATION",
    "AUDIT_OBLIGATION",
    "NOT_APPLICABLE",
  ]) {
    if (!text.includes(requiredTerm)) {
      failures.push("Canonical coverage missing required concept: " + requiredTerm);
    }
  }
}

for (const path of compatibility) {
  if (!existsSync(path)) {
    failures.push("Missing compatibility pointer during migration: " + path);
    continue;
  }
  const text = readFileSync(path, "utf8");
  if (!text.includes("Compatibility pointer")) {
    failures.push(path + " must remain a compatibility pointer during migration.");
  }
  if (!text.includes("bug-finding-coverage.md")) {
    failures.push(path + " must route to bug-finding-coverage.md.");
  }
  if (text.length > 1200) {
    failures.push(path + " has grown into a parallel coverage authority.");
  }
}

const routes = [
  "docs/03-analysis/README.md",
  "docs/03-analysis/master-selected-map-audit-workflow.md",
  ".agents/skills/m-bedrock-map-bug-audit/SKILL.md",
];
for (const path of routes) {
  if (!existsSync(path)) {
    failures.push("Missing canonical routing file: " + path);
    continue;
  }
  const text = readFileSync(path, "utf8");
  if (!text.includes("bug-finding-coverage.md")) {
    failures.push(path + " does not route to canonical bug-finding coverage.");
  }
}

if (!existsSync("engine/reliability/catalogs/knowledge-detector-bindings.json")) {
  failures.push("Missing knowledge-to-detector coverage registry.");
}

if (failures.length) {
  console.error("Bug-finding coverage violations:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Bug-finding coverage verification passed.");
