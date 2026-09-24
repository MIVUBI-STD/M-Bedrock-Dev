import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseMcFunction } from "../../../analyzers/functions/src/parse.js";
import { parseScriptFile } from "../../../analyzers/scripts/src/parse.js";
import type { ParsedScriptFile } from "../../../analyzers/scripts/src/types.js";
import { parseEntityDefinition } from "../../../analyzers/entities/src/parse.js";
import { parseDialogueDocument } from "../../../analyzers/dialogue/src/index.js";
import { dialogueDocumentDiagnostics } from "../../../analyzers/diagnostics/src/dialogue-findings.js";
import { embeddedStructureCommandDiagnostics } from "../../../analyzers/diagnostics/src/embedded-structure-command-findings.js";
import { commandChainDiagnostics } from "../../../analyzers/diagnostics/src/command-chain-findings.js";
import {
  structureInvariantDiagnostics,
  structureParseFailedDiagnostic,
} from "../../../analyzers/diagnostics/src/structure-findings.js";
import { parseMcStructure } from "../../../adapters/mcstructure/src/parse.js";
import { deriveMcStructureSemantics } from "../../../adapters/mcstructure/src/semantics.js";
import { extractStructureRuntimeContent } from "../../../adapters/mcstructure/src/runtime-content.js";
import { analyzeCommandBlockChains } from "../../../adapters/mcstructure/src/command-chain.js";
import { SemanticGraph } from "../../graph/src/graph.js";
import type { SemanticNode } from "../../graph/src/types.js";
import type { DiagnosticFinding } from "../../diagnostics/src/index.js";
import type { FileInventoryEntry } from "../../project-model/src/project.js";
import { semanticNodeId } from "../../project-model/src/identity.js";
import { analyzeEmbeddedStructureCommands } from "./embedded-structure-commands.js";
import {
  functionIdentifier,
  scriptIdentifier,
  structureIdentifier,
} from "./inspect-identifiers.js";

export interface InspectionSourceIndex {
  graph: SemanticGraph;
  nodes: SemanticNode[];
  parsedFunctions: Array<{
    node: SemanticNode;
    parsed: ReturnType<typeof parseMcFunction>;
  }>;
  parsedScripts: Array<{
    node: SemanticNode;
    parsed: ParsedScriptFile;
  }>;
  parsedEntities: Array<{
    node: SemanticNode;
    parsed: ReturnType<typeof parseEntityDefinition>;
  }>;
  parsedDialogueDocuments: ReturnType<
    typeof parseDialogueDocument
  >[];
  parsedStructureModels: Array<{
    identifier: string;
    node: SemanticNode;
    size?: { x: number; y: number; z: number };
    semantics: ReturnType<
      typeof deriveMcStructureSemantics
    >;
    embeddedCommands: ReturnType<
      typeof analyzeEmbeddedStructureCommands
    >;
    queuedTickPositions: number;
  }>;
  parsedStructures: number;
  diagnostics: DiagnosticFinding[];
}

export async function indexInspectionSources(
  root: string,
  artifactId: string,
  files: readonly FileInventoryEntry[],
): Promise<InspectionSourceIndex> {
  const graph = new SemanticGraph();
  const nodes: SemanticNode[] = [];
  const parsedFunctions: InspectionSourceIndex["parsedFunctions"] = [];
  const parsedScripts: InspectionSourceIndex["parsedScripts"] = [];
  const parsedEntities: InspectionSourceIndex["parsedEntities"] = [];
  const parsedDialogueDocuments:
    InspectionSourceIndex["parsedDialogueDocuments"] = [];
  const parsedStructureModels:
    InspectionSourceIndex["parsedStructureModels"] = [];
  const diagnostics: DiagnosticFinding[] = [];
  let parsedStructures = 0;

  for (const file of files) {
    const fnId = functionIdentifier(file.relativePath);
    if (fnId) {
      const node: SemanticNode = {
        id: semanticNodeId("function", "project", fnId),
        identity: {
          kind: "function",
          scope: "project",
          identifier: fnId,
        },
        kind: "function",
        identifier: fnId,
        source: {
          artifactId,
          relativePath: file.relativePath,
        },
      };
      graph.addNode(node);
      nodes.push(node);
      parsedFunctions.push({
        node,
        parsed: parseMcFunction(
          fnId,
          await readFile(
            join(root, file.relativePath),
            "utf8",
          ),
          node.source,
        ),
      });
      continue;
    }

    const scriptId = scriptIdentifier(file.relativePath);
    if (scriptId) {
      const node: SemanticNode = {
        id: semanticNodeId(
          "script_file",
          "project",
          scriptId,
        ),
        identity: {
          kind: "script_file",
          scope: "project",
          identifier: scriptId,
        },
        kind: "script_file",
        identifier: scriptId,
        source: {
          artifactId,
          relativePath: file.relativePath,
        },
      };
      graph.addNode(node);
      nodes.push(node);
      parsedScripts.push({
        node,
        parsed: parseScriptFile(
          scriptId,
          await readFile(
            join(root, file.relativePath),
            "utf8",
          ),
          node.source,
        ),
      });
      continue;
    }

    const normalizedPath =
      "/" + file.relativePath.replaceAll("\\", "/");
    const isEntityJson =
      normalizedPath.includes("/entities/") &&
      normalizedPath.endsWith(".json");

    if (isEntityJson) {
      try {
        const raw = JSON.parse(
          await readFile(
            join(root, file.relativePath),
            "utf8",
          ),
        ) as unknown;
        const parsed = parseEntityDefinition(raw, {
          artifactId,
          relativePath: file.relativePath,
        });

        if (parsed.identifier) {
          const node: SemanticNode = {
            id: semanticNodeId(
              "entity",
              "project",
              parsed.identifier,
            ),
            identity: {
              kind: "entity",
              scope: "project",
              identifier: parsed.identifier,
            },
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
          await readFile(
            join(root, file.relativePath),
            "utf8",
          ),
        ) as unknown;
        const dialogue = parseDialogueDocument(raw, {
          artifactId,
          relativePath: file.relativePath,
        });

        if (dialogue) {
          parsedDialogueDocuments.push(dialogue);
          diagnostics.push(
            ...dialogueDocumentDiagnostics(dialogue),
          );
          continue;
        }
      } catch {
        // Generic malformed JSON handling remains outside dialogue diagnostics.
      }
    }

    const structureId =
      structureIdentifier(file.relativePath);
    if (!structureId) continue;

    const node: SemanticNode = {
      id: semanticNodeId(
        "structure",
        "project",
        structureId,
      ),
      identity: {
        kind: "structure",
        scope: "project",
        identifier: structureId,
      },
      kind: "structure",
      identifier: structureId,
      source: {
        artifactId,
        relativePath: file.relativePath,
      },
    };
    graph.addNode(node);
    nodes.push(node);

    try {
      const structure = await parseMcStructure(
        new Uint8Array(
          await readFile(join(root, file.relativePath)),
        ),
        file.relativePath,
      );
      parsedStructures += 1;

      const runtimeContent =
        extractStructureRuntimeContent(structure);
      const embeddedCommands =
        analyzeEmbeddedStructureCommands(
          runtimeContent.commandBlocks,
          node.source,
        );

      parsedStructureModels.push({
        identifier: structureId,
        node,
        ...(structure.size
          ? { size: structure.size }
          : {}),
        semantics: deriveMcStructureSemantics(structure),
        embeddedCommands,
        queuedTickPositions:
          runtimeContent.queuedTickPositions,
      });

      diagnostics.push(
        ...embeddedStructureCommandDiagnostics(
          embeddedCommands.map((item) => ({
            flatIndex: item.block.flatIndex,
            command: item.block.command,
            ...(item.block.auto !== undefined
              ? { auto: item.block.auto }
              : {}),
            ...(item.block.tickDelay !== undefined
              ? { tickDelay: item.block.tickDelay }
              : {}),
            unknownEffects: item.unknownEffects,
          })),
          node.source,
        ),
      );

      diagnostics.push(
        ...commandChainDiagnostics(
          analyzeCommandBlockChains(
            runtimeContent.commandBlocks,
          ).issues,
          node.source,
        ),
      );
      diagnostics.push(
        ...structureInvariantDiagnostics(
          structure,
          node.source,
        ),
      );
    } catch (error) {
      diagnostics.push(
        structureParseFailedDiagnostic(
          node.source,
          error,
        ),
      );
    }
  }

  return {
    graph,
    nodes,
    parsedFunctions,
    parsedScripts,
    parsedEntities,
    parsedDialogueDocuments,
    parsedStructureModels,
    parsedStructures,
    diagnostics,
  };
}
