import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { classifyContentPath } from "../../../analyzers/discovery/src/classify.js";
import { discoverPackCandidates } from "../../../analyzers/discovery/src/pack-discovery.js";
import { analyzeManifest, classifyPackFromManifest } from "../../../analyzers/manifest/src/analyze.js";
import { parseMcFunction } from "../../../analyzers/functions/src/parse.js";
import { referenceDiagnostics } from "../../../analyzers/diagnostics/src/reference-findings.js";
import { duplicateManifestUuidDiagnostics } from "../../../analyzers/diagnostics/src/manifest-findings.js";
import { SemanticGraph } from "../../graph/src/graph.js";
import type { SemanticNode } from "../../graph/src/types.js";
import { buildFilesystemInventory } from "../../project-model/src/filesystem-inventory.js";
import { semanticNodeId } from "../../project-model/src/identity.js";
import type { DiagnosticFinding } from "../../diagnostics/src/types.js";
import { populateFunctionEdges } from "../../../analyzers/references/src/populate-function-edges.js";

export interface InspectDirectoryResult {
  files: number;
  packs: Array<{ root: string; type: string; uuid?: string }>;
  functions: number;
  structures: number;
  diagnostics: DiagnosticFinding[];
  unresolvedReferences: number;
}

function functionIdentifier(path: string): string | undefined {
  const marker = "/functions/";
  const normalized = "/" + path.replaceAll("\\", "/");
  const index = normalized.lastIndexOf(marker);
  if (index < 0 || !normalized.endsWith(".mcfunction")) return undefined;
  return normalized.slice(index + marker.length, -".mcfunction".length);
}

function structureIdentifier(path: string): string | undefined {
  const marker = "/structures/";
  const normalized = "/" + path.replaceAll("\\", "/");
  const index = normalized.lastIndexOf(marker);
  if (index < 0 || !normalized.endsWith(".mcstructure")) return undefined;
  return normalized.slice(index + marker.length, -".mcstructure".length);
}

export async function inspectDirectory(
  root: string,
  artifactId = "art_working",
): Promise<InspectDirectoryResult> {
  const files = await buildFilesystemInventory(root);
  for (const file of files) file.kindHint = classifyContentPath(file.relativePath).kindHint;

  const packs: InspectDirectoryResult["packs"] = [];
  const manifests = [];
  for (const pack of discoverPackCandidates(files)) {
    const raw = JSON.parse(await readFile(join(root, pack.manifestPath), "utf8")) as unknown;
    const manifest = analyzeManifest(raw, { artifactId, relativePath: pack.manifestPath });
    manifests.push(manifest);

    const normalizedPack: InspectDirectoryResult["packs"][number] = {
      root: pack.root,
      type: classifyPackFromManifest(manifest),
    };
    if (manifest.headerUuid) normalizedPack.uuid = manifest.headerUuid;
    packs.push(normalizedPack);
  }

  const graph = new SemanticGraph();
  const nodes: SemanticNode[] = [];
  const parsedFunctions = [];

  for (const file of files) {
    const fnId = functionIdentifier(file.relativePath);
    if (fnId) {
      const node: SemanticNode = {
        id: semanticNodeId("function", "project", fnId),
        kind: "function",
        identifier: fnId,
        source: { artifactId, relativePath: file.relativePath },
      };
      graph.addNode(node);
      nodes.push(node);
      parsedFunctions.push({
        node,
        parsed: parseMcFunction(
          fnId,
          await readFile(join(root, file.relativePath), "utf8"),
          node.source,
        ),
      });
      continue;
    }

    const structureId = structureIdentifier(file.relativePath);
    if (structureId) {
      const node: SemanticNode = {
        id: semanticNodeId("structure", "project", structureId),
        kind: "structure",
        identifier: structureId,
        source: { artifactId, relativePath: file.relativePath },
      };
      graph.addNode(node);
      nodes.push(node);
    }
  }

  const scoreboardIds = new Set<string>();
  const tagIds = new Set<string>();
  for (const { parsed } of parsedFunctions) {
    for (const ref of parsed.references) {
      if ("objective" in ref) scoreboardIds.add(ref.objective);
      if ("tag" in ref) tagIds.add(ref.tag);
    }
  }

  for (const objective of scoreboardIds) {
    const node: SemanticNode = {
      id: semanticNodeId("scoreboard_objective", "project", objective),
      kind: "scoreboard_objective",
      identifier: objective,
      source: { artifactId, relativePath: "<derived>" },
    };
    graph.addNode(node);
    nodes.push(node);
  }

  for (const tag of tagIds) {
    const node: SemanticNode = {
      id: semanticNodeId("tag", "project", tag),
      kind: "tag",
      identifier: tag,
      source: { artifactId, relativePath: "<derived>" },
    };
    graph.addNode(node);
    nodes.push(node);
  }

  for (const item of parsedFunctions) {
    populateFunctionEdges(graph, item.node, item.parsed, nodes);
  }

  const diagnostics = [
    ...duplicateManifestUuidDiagnostics(manifests),
    ...referenceDiagnostics([
      ...graph.unresolvedEdges(),
      ...graph.ambiguousEdges(),
    ]),
  ];

  return {
    files: files.length,
    packs,
    functions: nodes.filter((node) => node.kind === "function").length,
    structures: nodes.filter((node) => node.kind === "structure").length,
    diagnostics,
    unresolvedReferences: graph.unresolvedEdges().length,
  };
}
