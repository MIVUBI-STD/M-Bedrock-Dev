import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value !== null && typeof value === "object") {
    return "{" +
      Object.keys(value)
        .sort()
        .map((key) =>
          JSON.stringify(key) + ":" + canonicalJson(value[key])
        )
        .join(",") +
      "}";
  }
  return JSON.stringify(value);
}

const path = "docs/06-system/contract-registry.json";
if (!existsSync(path)) {
  console.error("Missing canonical contract registry: " + path);
  process.exit(1);
}

const registry = JSON.parse(readFileSync(path, "utf8"));
const canonicalRevision = createHash("sha256")
  .update(canonicalJson({
    schemaVersion: registry.schemaVersion,
    contracts: registry.contracts,
  }))
  .digest("hex");

const revisionOwner =
  "packages/project-model/src/contract-registry-revision.ts";
if (!existsSync(revisionOwner)) {
  console.error(
    "Missing generated contract registry revision owner: " +
      revisionOwner,
  );
  process.exit(1);
}
const revisionText = readFileSync(revisionOwner, "utf8");
const revisionMatch = revisionText.match(
  /CONTRACT_REGISTRY_REVISION\s*=\s*["']([a-f0-9]{64})["']/,
);
if (!revisionMatch) {
  console.error(
    "Generated contract registry revision constant is missing or invalid.",
  );
  process.exit(1);
}
if (revisionMatch[1] !== canonicalRevision) {
  console.error(
    "Contract registry revision is stale. Expected " +
      canonicalRevision +
      " but found " +
      revisionMatch[1] +
      ".",
  );
  process.exit(1);
}
if (registry.schemaVersion !== 1 || !Array.isArray(registry.contracts)) {
  console.error("Invalid contract registry root.");
  process.exit(1);
}

const ids = new Set();
const canonicalSymbols = new Map();
const allowedStatuses = new Set(["canonical", "deprecated"]);
const requiredArrayFields = ["producers", "consumers"];

for (const contract of registry.contracts) {
  for (const field of ["id", "symbol", "owner", "verificationLevel", "status"]) {
    if (typeof contract[field] !== "string" || !contract[field].trim()) {
      console.error("Contract registry entry has invalid " + field + ".");
      process.exit(1);
    }
  }

  if (contract.schemaVersion !== 1) {
    console.error("Contract " + contract.id + " has unsupported schemaVersion.");
    process.exit(1);
  }

  for (const field of requiredArrayFields) {
    if (!Array.isArray(contract[field]) || contract[field].some((value) => typeof value !== "string" || !value.trim())) {
      console.error("Contract " + contract.id + " has invalid " + field + ".");
      process.exit(1);
    }
  }

  if (!allowedStatuses.has(contract.status)) {
    console.error("Contract " + contract.id + " has invalid status " + contract.status + ".");
    process.exit(1);
  }

  if (ids.has(contract.id)) {
    console.error("Duplicate contract registry id: " + contract.id);
    process.exit(1);
  }
  ids.add(contract.id);

  if (!existsSync(contract.owner)) {
    console.error("Contract " + contract.id + " owner file does not exist: " + contract.owner);
    process.exit(1);
  }

  const ownerText = readFileSync(contract.owner, "utf8");
  const escaped = contract.symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exportPattern = new RegExp("export\\s+(?:type|interface|class|const|function)\\s+" + escaped + "\\b");
  if (!exportPattern.test(ownerText)) {
    console.error("Contract " + contract.id + " symbol " + contract.symbol + " is not exported by owner " + contract.owner + ".");
    process.exit(1);
  }

  if (contract.status === "canonical") {
    const current = canonicalSymbols.get(contract.symbol);
    if (current && current !== contract.owner) {
      console.error("Canonical contract symbol has multiple owners: " + contract.symbol + " -> " + current + " and " + contract.owner);
      process.exit(1);
    }
    canonicalSymbols.set(contract.symbol, contract.owner);
  }

  if (contract.status === "deprecated") {
    if (typeof contract.replacedBy !== "string" || !contract.replacedBy.trim()) {
      console.error("Deprecated contract " + contract.id + " must declare replacedBy.");
      process.exit(1);
    }
  }
}

for (const contract of registry.contracts) {
  if (contract.status === "deprecated" && !ids.has(contract.replacedBy)) {
    console.error("Deprecated contract " + contract.id + " references unknown replacement " + contract.replacedBy);
    process.exit(1);
  }
}

console.log("Contract registry verification passed (" + registry.contracts.length + " contracts).");
