import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const roots = [
  "engine/knowledge",
  "engine/contracts/engineering/catalogs",
];
const bindingPath = "engine/reliability/catalogs/knowledge-detector-bindings.json";

function filesUnder(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name).replaceAll("\\", "/");
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function isActionable(item) {
  return (
    item.classification === "engineering-contract" ||
    item.classification === "derived-rule" ||
    (Array.isArray(item.riskSurfaces) && item.riskSurfaces.length > 0) ||
    (Array.isArray(item.diagnosticHints) && item.diagnosticHints.length > 0) ||
    typeof item.diagnosticSeverity === "string" ||
    (Array.isArray(item.causalConsequences) && item.causalConsequences.length > 0) ||
    (item.causalCorroborators && Object.keys(item.causalCorroborators).length > 0) ||
    (item.causalOutcomePredicates && Object.keys(item.causalOutcomePredicates).length > 0)
  );
}

const bindings = existsSync(bindingPath)
  ? JSON.parse(readFileSync(bindingPath, "utf8")).bindings ?? []
  : [];
const bound = new Set(bindings.map((item) => item.knowledgeId));

const actionable = [];
const passive = [];

for (const root of roots) {
  for (const path of filesUnder(root).filter((item) => item.endsWith(".json"))) {
    if (path.endsWith("/ownership.json")) continue;
    const catalog = JSON.parse(readFileSync(path, "utf8"));
    for (const kind of ["facts", "relations"]) {
      for (const item of catalog[kind] ?? []) {
        if (typeof item.id !== "string" || !item.id.trim()) continue;
        const record = {
          id: item.id,
          path,
          kind: kind === "facts" ? "fact" : "relation",
          classification: item.classification ?? "unspecified",
        };
        (isActionable(item) ? actionable : passive).push(record);
      }
    }
  }
}

const missing = actionable.filter((item) => !bound.has(item.id));
const stale = [...bound].filter(
  (id) => !actionable.some((item) => item.id === id) && !passive.some((item) => item.id === id),
);

const result = {
  schemaVersion: 1,
  actionableKnowledge: actionable.length,
  passiveKnowledge: passive.length,
  dedicatedBindings: bound.size,
  actionableWithoutDedicatedBinding: missing.length,
  staleBindings: stale.length,
  missing,
  stale,
};

console.log(JSON.stringify(result, null, 2));

if (process.argv.includes("--strict") && (missing.length > 0 || stale.length > 0)) {
  process.exit(1);
}
