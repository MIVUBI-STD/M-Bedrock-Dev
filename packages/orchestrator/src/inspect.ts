import { readFile } from "node:fs/promises";
import { join, posix } from "node:path";
import { classifyContentPath } from "../../../analyzers/discovery/src/classify.js";
import { discoverPackCandidates } from "../../../analyzers/discovery/src/pack-discovery.js";
import { analyzeManifest, classifyPackFromManifest } from "../../../analyzers/manifest/src/analyze.js";
import { deriveManifestCompatibilityFacts } from "../../../analyzers/manifest/src/compatibility.js";
import { parseMcFunction } from "../../../analyzers/functions/src/parse.js";
import { parseScriptFile } from "../../../analyzers/scripts/src/parse.js";
import { parseEntityDefinition } from "../../../analyzers/entities/src/parse.js";
import { parseDialogueDocument } from "../../../analyzers/dialogue/src/parse.js";
import { entityKnowledgeDiagnostics } from "../../../analyzers/diagnostics/src/entity-knowledge-findings.js";
import { entityTransitionDiagnostics } from "../../../analyzers/diagnostics/src/entity-transition-findings.js";
import { analyzeEntityTransitionReachability } from "../../../analyzers/entities/src/reachability.js";
import { resolveScriptImports } from "../../../analyzers/scripts/src/resolve.js";
import { referenceDiagnostics } from "../../../analyzers/diagnostics/src/reference-findings.js";
import { duplicateManifestUuidDiagnostics } from "../../../analyzers/diagnostics/src/manifest-findings.js";
import { undeclaredMinecraftModuleDiagnostics } from "../../../analyzers/diagnostics/src/script-findings.js";
import { scriptExecutionPrivilegeDiagnostics } from "../../../analyzers/diagnostics/src/script-privilege-findings.js";
import { scriptVersionDiagnostics } from "../../../analyzers/diagnostics/src/script-version-findings.js";
import { scriptEventSymbolDiagnostics } from "../../../analyzers/diagnostics/src/script-event-findings.js";
import { scriptMethodSymbolDiagnostics } from "../../../analyzers/diagnostics/src/script-method-findings.js";
import {
  structureInvariantDiagnostics,
  structureParseFailedDiagnostic,
} from "../../../analyzers/diagnostics/src/structure-findings.js";
import { parseMcStructure } from "../../../adapters/mcstructure/src/parse.js";
import { deriveMcStructureSemantics } from "../../../adapters/mcstructure/src/semantics.js";
import { extractStructureRuntimeContent } from "../../../adapters/mcstructure/src/runtime-content.js";
import { analyzeCommandBlockChains } from "../../../adapters/mcstructure/src/command-chain.js";
import { deriveEducationProfile } from "../../compatibility/src/education.js";
import { educationRequirementDiagnostic } from "../../../analyzers/diagnostics/src/education-findings.js";
import { SemanticGraph } from "../../graph/src/graph.js";
import type { SemanticNode } from "../../graph/src/types.js";
import { buildFilesystemInventory } from "../../project-model/src/filesystem-inventory.js";
import { semanticNodeId } from "../../project-model/src/identity.js";
import type { DiagnosticFinding } from "../../diagnostics/src/types.js";
import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
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
import { deriveReliabilityFingerprint } from "./reliability-fingerprint.js";
import { analyzeEntityWithKnowledge } from "./entity-knowledge-analysis.js";
import { analyzeStructureAndChunkRuntime } from "./structure-runtime-analysis.js";
import { structureRuntimeDiagnostics } from "../../../analyzers/diagnostics/src/structure-runtime-findings.js";
import { embeddedStructureCommandDiagnostics } from "../../../analyzers/diagnostics/src/embedded-structure-command-findings.js";
import { commandChainDiagnostics } from "../../../analyzers/diagnostics/src/command-chain-findings.js";
import { dialogueDocumentDiagnostics } from "../../../analyzers/diagnostics/src/dialogue-findings.js";
import { analyzeEmbeddedStructureCommands } from "./embedded-structure-commands.js";
import { embeddedCommandStateIdentifiers, populateEmbeddedStructureCommandGraph } from "./embedded-structure-graph.js";
import { createDialogueSceneNodes, dialogueStateIdentifiers, populateDialogueCommandGraph, type DialogueGraphDocument } from "./dialogue-graph.js";
import { derivePlacedEmbeddedCommands } from "./structure-placement-analysis.js";
import { deriveScriptApiUsage } from "./script-api-usage.js";

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
  knowledgeCatalog?: KnowledgeCatalog,
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
  const parsedEntities: Array<{ node: SemanticNode; parsed: ReturnType<typeof parseEntityDefinition> }> = [];
  const parsedDialogueDocuments: ReturnType<typeof parseDialogueDocument>[] = [];
  const parsedStructureModels: Array<{ identifier: string; node: SemanticNode; size?: { x: number; y: number; z: number }; semantics: ReturnType<typeof deriveMcStructureSemantics>; embeddedCommands: ReturnType<typeof analyzeEmbeddedStructureCommands>; queuedTickPositions: number }> = [];
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

    const normalizedPath = "/" + file.relativePath.replaceAll("\\", "/");
    const isEntityJson = normalizedPath.includes("/entities/") &&
      normalizedPath.endsWith(".json");
    if (isEntityJson) {
      try {
        const raw = JSON.parse(await readFile(join(root, file.relativePath), "utf8")) as unknown;
        const parsed = parseEntityDefinition(raw, {
          artifactId,
          relativePath: file.relativePath,
        });
        if (parsed.identifier) {
          const node: SemanticNode = {
            id: semanticNodeId("entity", "project", parsed.identifier),
            identity: { kind: "entity", scope: "project", identifier: parsed.identifier },
            kind: "entity",
            identifier: parsed.identifier,
            source: parsed.source,
          };
          graph.addNode(node);
          nodes.push(node);
          parsedEntities.push({ node, parsed });
        }
      } catch {
        // Generic malformed JSON handling remains outside entity knowledge diagnostics.
      }
      continue;
    }

    if (normalizedPath.endsWith(".json")) {
      try {
        const raw = JSON.parse(
          await readFile(join(root, file.relativePath), "utf8"),
        ) as unknown;
        const dialogue = parseDialogueDocument(raw, {
          artifactId,
          relativePath: file.relativePath,
        });
        if (dialogue) {
          parsedDialogueDocuments.push(dialogue);
          diagnostics.push(...dialogueDocumentDiagnostics(dialogue));
          continue;
        }
      } catch {
        // Generic malformed JSON handling remains outside dialogue diagnostics.
      }
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
        const runtimeContent = extractStructureRuntimeContent(structure);
        const embeddedCommands = analyzeEmbeddedStructureCommands(
          runtimeContent.commandBlocks,
          node.source,
        );
        parsedStructureModels.push({
          identifier: structureId,
          node,
          ...(structure.size ? { size: structure.size } : {}),
          semantics: deriveMcStructureSemantics(structure),
          embeddedCommands,
          queuedTickPositions: runtimeContent.queuedTickPositions,
        });
        diagnostics.push(...embeddedStructureCommandDiagnostics(
          embeddedCommands.map((item) => ({
            flatIndex: item.block.flatIndex,
            command: item.block.command,
            ...(item.block.auto !== undefined ? { auto: item.block.auto } : {}),
            ...(item.block.tickDelay !== undefined ? { tickDelay: item.block.tickDelay } : {}),
            unknownEffects: item.unknownEffects,
          })),
          node.source,
        ));
        diagnostics.push(...commandChainDiagnostics(
          analyzeCommandBlockChains(runtimeContent.commandBlocks).issues,
          node.source,
        ));
        diagnostics.push(...structureInvariantDiagnostics(structure, node.source));
      } catch (error) {
        diagnostics.push(structureParseFailedDiagnostic(node.source, error));
      }
    }
  }

  const dialogueGraphDocuments: DialogueGraphDocument[] = parsedDialogueDocuments
    .filter((item): item is NonNullable<typeof item> => item !== undefined)
    .map((document) => createDialogueSceneNodes(graph, document, nodes));

  const scoreboardIds = new Set<string>();
  const tagIds = new Set<string>();

  const dialogueIds = dialogueStateIdentifiers(dialogueGraphDocuments);
  for (const objective of dialogueIds.scoreboardObjectives) scoreboardIds.add(objective);
  for (const tag of dialogueIds.tags) tagIds.add(tag);
  for (const structure of parsedStructureModels) {
    const identifiers = embeddedCommandStateIdentifiers(structure.embeddedCommands);
    for (const objective of identifiers.scoreboardObjectives) scoreboardIds.add(objective);
    for (const tag of identifiers.tags) tagIds.add(tag);
  }
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

  for (const dialogue of dialogueGraphDocuments) {
    populateDialogueCommandGraph(graph, dialogue, nodes);
  }

  for (const structure of parsedStructureModels) {
    populateEmbeddedStructureCommandGraph(
      graph,
      structure.node,
      structure.identifier,
      structure.embeddedCommands,
      nodes,
    );
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
    diagnostics.push(...scriptExecutionPrivilegeDiagnostics(scripts));
    const scriptCompatibility = deriveManifestCompatibilityFacts(manifest);
    diagnostics.push(...scriptVersionDiagnostics(
      scriptCompatibility,
      scripts,
    ));
    diagnostics.push(...scriptEventSymbolDiagnostics(
      scriptCompatibility,
      scripts,
    ));
    diagnostics.push(...scriptMethodSymbolDiagnostics(
      scriptCompatibility,
      scripts,
    ));
  }

  let entityStates = 0;
  let entityKnowledgeGaps = 0;
  let entityStaticLimits = 0;
  if (knowledgeCatalog) {
    for (const item of parsedEntities) {
      const profile = {
        edition: (target.edition ?? "bedrock") as "bedrock" | "education",
        ...(item.parsed.formatVersion ? { formatVersion: item.parsed.formatVersion } : {}),
        ...(target.experiments ? { experiments: target.experiments } : {}),
      };
      const analysis = analyzeEntityWithKnowledge(item.parsed, knowledgeCatalog, profile);
      entityStates += analysis.states;
      entityKnowledgeGaps += analysis.findings.length;
      entityStaticLimits += analysis.staticAnalysisLimits.length;
      diagnostics.push(...entityKnowledgeDiagnostics(analysis, item.node.source));
      diagnostics.push(...entityTransitionDiagnostics(
        analyzeEntityTransitionReachability(item.parsed),
        item.node.source,
      ));
    }
  }

  diagnostics.push(
    ...duplicateManifestUuidDiagnostics(manifests.map((entry) => entry.manifest)),
    ...referenceDiagnostics([
      ...graph.unresolvedEdges().filter((edge) => edge.type !== "IMPORTS_MINECRAFT_MODULE"),
      ...graph.ambiguousEdges(),
    ]),
  );

  const parsedFunctionModels = parsedFunctions.map((item) => item.parsed);
  const structureRuntime = analyzeStructureAndChunkRuntime(
    parsedFunctionModels,
    parsedStructureModels.map((item) => ({
      identifier: item.identifier,
      relativePath: item.node.source.relativePath,
      semantics: item.semantics,
    })),
  );
  const sourceByFunction = new Map(
    parsedFunctions.map((item) => [item.parsed.identifier, item.node.source]),
  );
  diagnostics.push(...structureRuntimeDiagnostics(structureRuntime, sourceByFunction));

  const placedEmbeddedCommands = structureRuntime.correlations.flatMap((correlation) => {
    if (correlation.status !== "resolved") return [];
    const parsed = parsedStructureModels.find(
      (item) => item.identifier === correlation.load.semantics.name,
    );
    if (!parsed) return [];
    return derivePlacedEmbeddedCommands(
      {
        ...(correlation.load.semantics.position
          ? { position: correlation.load.semantics.position }
          : {}),
        ...(correlation.load.semantics.rotation
          ? { rotation: correlation.load.semantics.rotation }
          : {}),
        ...(correlation.load.semantics.mirror
          ? { mirror: correlation.load.semantics.mirror }
          : {}),
      },
      parsed.size,
      parsed.embeddedCommands.map((item) => item.block),
    ).map((item) => ({
      target: correlation.load.semantics.name,
      flatIndex: item.flatIndex,
      worldX: item.world.x,
      worldY: item.world.y,
      worldZ: item.world.z,
      chunkX: Math.floor(item.world.x / 16),
      chunkZ: Math.floor(item.world.z / 16),
      command: item.command,
      confidence: item.confidence,
    }));
  });

  const topology = analyzeFunctionTopology(parsedFunctionModels);
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

  const educationSpecialtyBlocks = {
    allow: parsedStructureModels.reduce(
      (sum, item) => sum + item.semantics.educationAllowEntries,
      0,
    ),
    deny: parsedStructureModels.reduce(
      (sum, item) => sum + item.semantics.educationDenyEntries,
      0,
    ),
    border: parsedStructureModels.reduce(
      (sum, item) => sum + item.semantics.educationBorderEntries,
      0,
    ),
  };
  const educationSpecialtyCount =
    educationSpecialtyBlocks.allow +
    educationSpecialtyBlocks.deny +
    educationSpecialtyBlocks.border;

  if (educationSpecialtyCount > 0) {
    const finding = educationRequirementDiagnostic(targetEducation);
    if (finding) {
      diagnostics.push({
        ...finding,
        data: {
          ...(finding.data ?? {}),
          educationSpecialtyBlocks,
        },
      });
    }
  }

  const dbFiles = files.filter((file) => {
    const normalized = "/" + file.relativePath.replaceAll("\\", "/");
    return normalized.includes("/db/");
  });

  const scriptApiUsage = deriveScriptApiUsage(
    parsedScripts.map((item) => item.parsed),
  );

  const reliability = deriveReliabilityFingerprint({
    mapId: artifactId,
    ...(sourceFingerprint ? { artifactFingerprint: sourceFingerprint } : {}),
    packs,
    functions: parsedFunctions.map((item) => item.parsed),
    scripts: parsedScripts.map((item) => item.parsed),
    structures: nodes.filter((node) => node.kind === "structure").length,
    parsedStructures,
    entities: parsedEntities.length,
    entityKnowledgeGaps,
    worldDatabasePresent: dbFiles.length > 0,
    stateAccesses: topology.stateAccesses.length,
    broadStateWrites: topology.broadWrites,
    repeatedTopologyCandidates: topology.candidates.length,
    diagnostics,
    target,
  });

  return {
    files: files.length,
    packs,
    functions: nodes.filter((node) => node.kind === "function").length,
    scripts: nodes.filter((node) => node.kind === "script_file").length,
    scriptApiUsage,
    structures: nodes.filter((node) => node.kind === "structure").length,
    parsedStructures,
    entities: parsedEntities.length,
    entityKnowledge: {
      analyzed: knowledgeCatalog ? parsedEntities.length : 0,
      states: entityStates,
      prerequisiteGaps: entityKnowledgeGaps,
      staticAnalysisLimits: entityStaticLimits,
    },
    worldDatabase: {
      present: dbFiles.length > 0,
      fileCount: dbFiles.length,
    },
    stateAnalysis: {
      accesses: topology.stateAccesses.length,
      broadWrites: topology.broadWrites,
    },
    structureRuntime: {
      loads: structureRuntime.structureLoads.length,
      resolvedLoads: structureRuntime.correlations.filter((item) => item.status === "resolved").length,
      unresolvedLoads: structureRuntime.unresolvedStructureLoads,
      probabilisticLoads: structureRuntime.probabilisticStructureLoads,
      runtimeLogicLoads: structureRuntime.runtimeLogicStructureLoads,
      tickingAreas: structureRuntime.chunkLifecycleEvidence.tickingAreas,
      preloadedTickingAreas: structureRuntime.chunkLifecycleEvidence.preloadedTickingAreas,
      areaLoadedSchedules: structureRuntime.chunkLifecycleEvidence.areaLoadedSchedules,
      embeddedCommandBlocks: parsedStructureModels.reduce(
        (sum, item) => sum + item.embeddedCommands.length,
        0,
      ),
      unknownEmbeddedCommandEffects: parsedStructureModels.reduce(
        (sum, item) => sum + item.embeddedCommands.reduce(
          (inner, command) => inner + command.unknownEffects,
          0,
        ),
        0,
      ),
      queuedTickPositions: parsedStructureModels.reduce(
        (sum, item) => sum + item.queuedTickPositions,
        0,
      ),
      educationSpecialtyBlocks,
      absoluteLoadDestinations: structureRuntime.absoluteLoadDestinations,
      placedEmbeddedCommands,
    },
    topologyAnalysis: {
      resolvedSpatialEffects: topology.resolvedSpatialEffects.length,
      repeatedCandidates: topology.candidates.length,
      linearOutliers: topology.linearOutliers.length,
    },
    reliability: {
      fingerprintId: reliability.id,
      fingerprint: reliability.fingerprint,
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
