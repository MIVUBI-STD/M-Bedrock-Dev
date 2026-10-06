import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildResourceCatalog } from "./resource-catalog.mjs";

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
const catalog = buildResourceCatalog();
const resourceByLocation = new Map(
  catalog.resources
    .filter(
      (resource) =>
        typeof resource.locator === "string" &&
        resource.locator.length > 0,
    )
    .map((resource) => [
      resource.path.replaceAll("\\", "/") +
        "#" +
        resource.locator,
      resource,
    ]),
);

const actionable = [];
const passive = [];

for (const root of roots) {
  for (const path of filesUnder(root).filter((item) => item.endsWith(".json"))) {
    if (path.endsWith("/ownership.json")) continue;
    const catalog = JSON.parse(readFileSync(path, "utf8"));
    for (const kind of ["facts", "relations"]) {
      for (const item of catalog[kind] ?? []) {
        if (typeof item.id !== "string" || !item.id.trim()) continue;
        const normalizedPath =
          path.replaceAll("\\", "/");
        const resource =
          kind === "facts"
            ? resourceByLocation.get(
                normalizedPath + "#" + item.id,
              )
            : undefined;
        const record = {
          id: item.id,
          path: normalizedPath,
          ...(resource === undefined
            ? {}
            : { resourceId: resource.id }),
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

const missingByOwner = Object.values(
  missing.reduce((groups, item) => {
    const current = groups[item.path] ?? {
      path: item.path,
      resourceIds: [],
      knowledgeIds: [],
    };
    if (item.resourceId !== undefined) {
      current.resourceIds.push(item.resourceId);
    }
    current.knowledgeIds.push(item.id);
    groups[item.path] = current;
    return groups;
  }, {}),
)
  .map((item) => ({
    ...item,
    resourceIds: [...new Set(item.resourceIds)].sort(),
    knowledgeIds: [...item.knowledgeIds].sort(),
    count: item.knowledgeIds.length,
  }))
  .sort((left, right) =>
    right.count - left.count ||
    left.path.localeCompare(right.path)
  );

const boundActionableKnowledge =
  actionable.length - missing.length;
const dedicatedBindingCoverage =
  actionable.length === 0
    ? 1
    : boundActionableKnowledge / actionable.length;

const result = {
  schemaVersion: 1,
  actionableKnowledge: actionable.length,
  passiveKnowledge: passive.length,
  dedicatedBindings: bound.size,
  boundActionableKnowledge,
  actionableWithoutDedicatedBinding: missing.length,
  dedicatedBindingCoverage,
  staleBindings: stale.length,
  missingByOwner,
  missing,
  stale,
};

console.log(JSON.stringify(result, null, 2));

if (process.argv.includes("--strict") && (missing.length > 0 || stale.length > 0)) {
  process.exit(1);
}