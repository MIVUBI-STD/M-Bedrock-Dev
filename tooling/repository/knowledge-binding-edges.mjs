import { existsSync, readFileSync } from "node:fs";

function knowledgeFactOwners(resources) {
  const owners = new Map();

  for (const resource of resources) {
    if (resource.class !== "KNOWLEDGE") continue;
    if (
      typeof resource.locator !== "string" ||
      !resource.locator
    ) {
      continue;
    }

    const previous = owners.get(resource.locator);
    if (
      previous !== undefined &&
      previous !== resource.id
    ) {
      throw new Error(
        "Knowledge fact has multiple Catalog owners: " +
          resource.locator +
          " -> " +
          previous +
          " / " +
          resource.id,
      );
    }

    owners.set(resource.locator, resource.id);
  }

  return owners;
}

function sourceResourceIdForPath(path, knownIds) {
  const normalized = path.replaceAll("\\", "/");

  for (const [prefix, domain] of [
    ["engine/packages/", "package"],
    ["engine/analyzers/", "analyzer"],
    ["engine/adapters/", "adapter"],
  ]) {
    if (!normalized.startsWith(prefix)) continue;
    const moduleName = normalized.slice(prefix.length).split("/")[0];
    if (!moduleName) return undefined;

    const id = "source." + domain + "." + moduleName;
    return knownIds.has(id) ? id : undefined;
  }

  return undefined;
}

export function buildKnowledgeBindingEdges(resources) {
  const bindingPath =
    "engine/reliability/catalogs/knowledge-detector-bindings.json";

  if (!existsSync(bindingPath)) return [];

  const data = JSON.parse(readFileSync(bindingPath, "utf8"));
  const factOwners = knowledgeFactOwners(resources);
  const knownIds = new Set(resources.map((resource) => resource.id));
  const edges = [];
  const seen = new Set();

  const add = (edge) => {
    const key = edge.from + "|" + edge.type + "|" + edge.to;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push(edge);
  };

  for (const binding of data.bindings ?? []) {
    const knowledgeResourceId = factOwners.get(binding.knowledgeId);
    if (knowledgeResourceId === undefined) {
      throw new Error(
        "Knowledge binding references unregistered fact: " +
          binding.knowledgeId,
      );
    }

    for (const sourcePath of binding.analyzerPaths ?? []) {
      const sourceId = sourceResourceIdForPath(sourcePath, knownIds);
      if (sourceId === undefined) {
        throw new Error(
          "Knowledge binding analyzer path has no SOURCE owner: " +
            sourcePath,
        );
      }

      add({
        from: sourceId,
        type: "USES",
        to: knowledgeResourceId,
      });
    }

    for (const proofPath of binding.proofPaths ?? []) {
      const sourceId = sourceResourceIdForPath(proofPath, knownIds);
      if (sourceId === undefined) {
        throw new Error(
          "Knowledge binding proof path has no SOURCE owner: " +
            proofPath,
        );
      }

      add({
        from: sourceId,
        type: "VALIDATES",
        to: knowledgeResourceId,
      });
    }
  }

  return edges.sort((left, right) => {
    const a = left.from + "|" + left.type + "|" + left.to;
    const b = right.from + "|" + right.type + "|" + right.to;
    return a.localeCompare(b);
  });
}