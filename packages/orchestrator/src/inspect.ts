import { readFile } from "node:fs/promises";
import { join, posix } from "node:path";
import { classifyContentPath } from "../../../analyzers/discovery/src/classify.js";
import { discoverPackCandidates } from "../../../analyzers/discovery/src/pack-discovery.js";
import { analyzeManifest, classifyPackFromManifest } from "../../../analyzers/manifest/src/analyze.js";
import { deriveManifestCompatibilityFacts } from "../../../analyzers/manifest/src/compatibility.js";
import { parseMcFunction } from "../../../analyzers/functions/src/parse.js";
import { parseScriptFile } from "../../../analyzers/scripts/src/parse.js";
import { resolveScriptImports } from "../../../analyzers/scripts/src/resolve.js";
import { referenceDiagnostics } from "../../../analyzers/diagnostics/src/reference-findings.js";
import { duplicateManifestUuidDiagnostics } from "../../../analyzers/diagnostics/src/manifest-findings.js";
import { undeclaredMinecraftModuleDiagnostics } from "../../../analyzers/diagnostics/src/script-findings.js";
import {
  structureInvariantDiagnostics,
  structureParseFailedDiagnostic,
} from "../../../analyzers/diagnostics/src/structure-findings.js";
import { parseMcStructure } from "../../../adapters/mcstructure/src/parse.js";
import { deriveEducationProfile } from "../../compatibility/src/education.js";
import { SemanticGraph } from "../../graph/src/graph.js";
import type { SemanticNode } from "../../graph/src/types.js";
import { buildFilesystemInventory } from "../../project-model/src/filesystem-inventory.js";
import { semanticNodeId } from "../../project-model/src/identity.js";
import type { DiagnosticFinding } from "../../diagnostics/src/types.js";
import { populateFunctionEdges } from "../../../analyzers/references/src/populate-function-edges.js";
import type { ManifestModel } from "../../../analyzers/manifest/src/types.js";
import type { ParsedScriptFile } from "../../../analyzers/scripts/src/types.js";
import type {
  InspectDirectoryResult,
  InspectedPack,
  InspectTargetProfile,
} from "./types.js";
import { analyzeFunctionTopology } from "./topology-analysis.js";
import { planInspectionRepairs } from "./repair-planning.js";

function functionIdentifier(path: string): string | undefined {
  const marker = "/functions/";
  const normalized = "/" + path.replaceAll("\\", "/");
  const index = normalized.lastIndexOf(marker);
  if (index < 0 || !normalized.endsWith(".mcfunction")) return undefined;
  return normalized.slice(index + marker.length, -".mcfunction".length);
}

function scriptIdentifier(path: string): string | undefined {
  const marker = "/scripts/";
  const normalized = "/" + path.replaceAll("\\", "/");
  const index = normalized.lastIndexOf(marker);
  if (index < 0) return undefined;

  const relative = normalized.slice(index + marker.length);
  const extension = posix.extname(relative);
  if (![".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"].includes(extension)) {
    return undefined;
  }

  return "scripts/" + relative.slice(0, -extension.length);
}

export function structureIdentifier(path: string): string | undefined {
  const marker = "/structures/";
  const normalized = "/" + path.replaceAll("\\", "/");
  const index = normalized.lastIndexOf(marker);
  if (index < 0 || !normalized.endsWith(".mcstructure")) return undefined;

  const relative = normalized.slice(index + marker.length, -".mcstructure".length);
  const slash = relative.indexOf("/");
  if (slash < 0) return relative;

  const namespace = relative.slice(0, slash);
  const name = relative.slice(slash + 1);
  if (!namespace || !name) return undefined;

  return `${namespace}:${name}`;
}

function isWithinPack(relativePath: string, packRoot: string): boolean {
  return relativePath === packRoot || relativePath.startsWith(packRoot.replace(/\/$/, "") + "/");
}

function formatVersion(value: { major: number; minor: number; patch: number } | undefined): string | undefined {
  return value ? `${value.major}.${value.minor}.${value.patch}` : undefined;
}

export async function inspectDirectory(
  root: string,
  artifactId = "art_working",
  target: InspectTargetProfile = {},
  sourceFingerprint?: string,
): Promise<InspectDirectoryResult> {
  const files = await buildFilesystemInventory(root);
  for (const file of files) file.kindHint = classifyContentPath(file.relativePath).kindHint;

  const packs: InspectedPack[] = [];
  const manifests: Array<{ root: string; manifest: ManifestModel }> = [];

  for (const pack of discoverPackCandidates(files)) {
    const raw = JSON.parse(await readFile(join(root, pack.manifestPath), "utf8")) as unknown;
    const manifest = analyzeManifest(raw, { artifactId, relativePath: pack.manifestPath });
    const compatibility = deriveManifestCompatibilityFacts(manifest);
    manifests.push({ root: pack.root, manifest });

    const normalizedPack: InspectedPack = {
      root: pack.root,
      type: classifyPackFromManifest(manifest),
      educationMetadata: compatibility.educationMetadata,
      scriptModules: compatibility.scriptModules,
    };

    if (manifest.headerUuid) normalizedPack.uuid = manifest.headerUuid;
    const minEngineVersion = formatVersion(compatibility.minEngineVersion);
    if (minEngineVersion) normalizedPack.minEngineVersion = minEngineVersion;
    packs.push(normalizedPack);
  }

  const graph = new SemanticGraph();
  const nodes: SemanticNode[] = [];
  const parsedFunctions = [];
  const parsedScripts: Array<{ node: SemanticNode; parsed: ParsedScriptFile }> = [];
  const diagnostics: DiagnosticFinding[] = [];
  let parsedStructures = 0;

  for (const file of files) {
    const fnId = functionIdentifier(file.relativePath);
    if (fnId) {
      const node: SemanticNode = {
        id: semanticNodeId("function", "project", fnId),
        identity: { kind: "function", scope: "project", identifier: fnId },
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

    const scriptId = scriptIdentifier(file.relativePath);
    if (scriptId) {
      const node: SemanticNode = {
        id: semanticNodeId("script_file", "project", scriptId),
        identity: { kind: "script_file", scope: "project", identifier: scriptId },
        kind: "script_file",
        identifier: scriptId,
        source: { artifactId, relativePath: file.relativePath },
      };
      graph.addNode(node);
      nodes.push(node);
      parsedScripts.push({
        node,
        parsed: parseScriptFile(
          scriptId,
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
        identity: { kind: "structure", scope: "project", identifier: structureId },
        kind: "structure",
        identifier: structureId,
        source: { artifactId, relativePath: file.relativePath },
      };
      graph.addNode(node);
      nodes.push(node);

      try {
        const structure = await parseMcStructure(
          new Uint8Array(await readFile(join(root, file.relativePath))),
          file.relativePath,
        );
        parsedStructures += 1;
        diagnostics.push(...structureInvariantDiagnostics(structure, node.source));
      } catch (error) {
        diagnostics.push(structureParseFailedDiagnostic(node.source, error));
      }
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
      identity: { kind: "scoreboard_objective", scope: "project", identifier: objective },
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
      identity: { kind: "tag", scope: "project", identifier: tag },
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

  const scriptResolutions = resolveScriptImports(parsedScripts.map((item) => item.parsed));
  const scriptNodesByIdentifier = new Map(
    parsedScripts.map((item) => [item.parsed.identifier, item.node]),
  );

  for (const resolution of scriptResolutions) {
    const from = scriptNodesByIdentifier.get(resolution.fromIdentifier);
    if (!from) continue;

    if (resolution.status === "external") {
      if (resolution.module.startsWith("@minecraft/")) {
        graph.addEdge({
          from: from.id,
          type: "IMPORTS_MINECRAFT_MODULE",
          targetIdentifier: resolution.module,
          status: "unresolved",
          evidence: { source: from.source },
        });
      }
      continue;
    }

    const targetNode = resolution.targetIdentifier
      ? scriptNodesByIdentifier.get(resolution.targetIdentifier)
      : undefined;

    graph.addEdge({
      from: from.id,
      type: "IMPORTS_SCRIPT",
      targetIdentifier: resolution.module,
      status: targetNode ? "resolved" : "unresolved",
      ...(targetNode ? { to: targetNode.id } : {}),
      evidence: { source: from.source },
    });
  }

  for (const { root: packRoot, manifest } of manifests) {
    const scripts = parsedScripts
      .filter((item) => isWithinPack(item.parsed.source.relativePath, packRoot))
      .map((item) => item.parsed);

    diagnostics.push(...undeclaredMinecraftModuleDiagnostics(manifest, scripts));
  }

  diagnostics.push(
    ...duplicateManifestUuidDiagnostics(manifests.map((entry) => entry.manifest)),
    ...referenceDiagnostics([
      ...graph.unresolvedEdges().filter((edge) => edge.type !== "IMPORTS_MINECRAFT_MODULE"),
      ...graph.ambiguousEdges(),
    ]),
  );

  const topology = analyzeFunctionTopology(parsedFunctions.map((item) => item.parsed));
  diagnostics.push(...topology.stateDiagnostics, ...topology.topologyDiagnostics);

  const educationMetadata = manifests.some(
    ({ manifest }) => manifest.hasEducationMetadata === true,
  );
  const targetEducation = deriveEducationProfile({
    edition: target.edition ?? "bedrock",
    manifestEducationMetadata: educationMetadata,
    ...(target.educationFeatures !== undefined
      ? { worldEducationFeatures: target.educationFeatures === "enabled" }
      : {}),
    ...(target.eduLevel !== undefined ? { eduLevel: target.eduLevel } : {}),
  });

  const dbFiles = files.filter((file) => {
    const normalized = "/" + file.relativePath.replaceAll("\\", "/");
    return normalized.includes("/db/");
  });

  return {
    files: files.length,
    packs,
    functions: nodes.filter((node) => node.kind === "function").length,
    scripts: nodes.filter((node) => node.kind === "script_file").length,
    structures: nodes.filter((node) => node.kind === "structure").length,
    parsedStructures,
    worldDatabase: {
      present: dbFiles.length > 0,
      fileCount: dbFiles.length,
    },
    stateAnalysis: {
      accesses: topology.stateAccesses.length,
      broadWrites: topology.broadWrites,
    },
    topologyAnalysis: {
      resolvedSpatialEffects: topology.resolvedSpatialEffects.length,
      repeatedCandidates: topology.candidates.length,
      linearOutliers: topology.linearOutliers.length,
    },
    repairCandidates: planInspectionRepairs(topology, sourceFingerprint),
    targetCompatibility: {
      edition: target.edition ?? "unknown",
      educationFeatures: target.edition === undefined && target.educationFeatures === undefined
        ? "unknown"
        : targetEducation.educationFeatures,
      ...(targetEducation.eduLevel !== undefined ? { eduLevel: targetEducation.eduLevel } : {}),
    },
    diagnostics,
    unresolvedReferences: graph.unresolvedEdges()
      .filter((edge) => edge.type !== "IMPORTS_MINECRAFT_MODULE").length,
  };
}
