import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  FUNCTION_PARSER_REVISION,
  parseMcFunction,
} from "../../../analyzers/functions/src/index.js";
import {
  SCRIPT_PARSER_REVISION,
  parseScriptFile,
} from "../../../analyzers/scripts/src/index.js";
import type { ParsedScriptFile } from "../../../analyzers/scripts/src/index.js";
import {
  ENTITY_PARSER_REVISION,
  parseEntityDefinition,
} from "../../../analyzers/entities/src/index.js";
import { parseDialogueDocument } from "../../../analyzers/dialogue/src/index.js";
import { dialogueDocumentDiagnostics } from "../../../analyzers/diagnostics/src/index.js";
import { embeddedStructureCommandDiagnostics } from "../../../analyzers/diagnostics/src/index.js";
import { commandChainDiagnostics } from "../../../analyzers/diagnostics/src/index.js";
import {
  structureInvariantDiagnostics,
  structureParseFailedDiagnostic,
} from "../../../analyzers/diagnostics/src/index.js";
import {
  MCSTRUCTURE_PARSER_REVISION,
  parseMcStructure,
} from "../../../adapters/mcstructure/src/index.js";
import { deriveMcStructureSemantics } from "../../../adapters/mcstructure/src/index.js";
import { extractStructureRuntimeContent } from "../../../adapters/mcstructure/src/index.js";
import { analyzeCommandBlockChains } from "../../../adapters/mcstructure/src/index.js";
import { SemanticGraph } from "../../graph/src/index.js";
import type { SemanticNode } from "../../graph/src/index.js";
import type { DiagnosticFinding } from "../../diagnostics/src/index.js";
import type { FileInventoryEntry } from "../../project-model/src/index.js";
import { semanticNodeId } from "../../project-model/src/index.js";
import { analyzeEmbeddedStructureCommands } from "./embedded-structure-commands.js";
import {
  functionIdentifier,
  scriptIdentifier,
  structureIdentifier,
} from "./inspect-identifiers.js";

export interface InspectionSourceParseFailure {
  relativePath: string;
  kind: "entity" | "structure";
  reason: string;
}

export interface InspectionSourceCoverage {
  relevantFiles: number;
  indexedFiles: number;
  parseFailures: readonly InspectionSourceParseFailure[];
  complete: boolean;
}

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
    text?: string;
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
  coverage: InspectionSourceCoverage;
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
  const parseFailures: InspectionSourceParseFailure[] = [];
  let relevantFiles = 0;
  let indexedFiles = 0;
  let parsedStructures = 0;

  for (const file of files) {
    const fnId = functionIdentifier(file.relativePath);
    if (fnId) {
      relevantFiles += 1;
      const node: SemanticNode = {
        id: semanticNodeId("function", "project", fnId),
        identity: {
          kind: "function",
          scope: "project",
          identifier: fnId,
        },
        kind: "function",
        identifier: fnId,
        ...(file.contentHash === undefined
          ? {}
          : { contentHash: file.contentHash }),
        parserVersion:
          FUNCTION_PARSER_REVISION,
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
      indexedFiles += 1;
      continue;
    }

    const scriptId = scriptIdentifier(file.relativePath);
    if (scriptId) {
      relevantFiles += 1;
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
        ...(file.contentHash === undefined
          ? {}
          : { contentHash: file.contentHash }),
        parserVersion:
          SCRIPT_PARSER_REVISION,
        source: {
          artifactId,
          relativePath: file.relativePath,
        },
      };
      graph.addNode(node);
      nodes.push(node);
      const scriptText =
        await readFile(
          join(root, file.relativePath),
          "utf8",
        );
      parsedScripts.push({
        node,
        text: scriptText,
        parsed: parseScriptFile(
          scriptId,
          scriptText,
          node.source,
        ),
      });
      indexedFiles += 1;
      continue;
    }

    const normalizedPath =
      "/" + file.relativePath.replaceAll("\\", "/");
    const isEntityJson =
      normalizedPath.includes("/entities/") &&
      normalizedPath.endsWith(".json");

    if (isEntityJson) {
      relevantFiles += 1;
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
            ...(file.contentHash === undefined
              ? {}
              : { contentHash: file.contentHash }),
            parserVersion:
              ENTITY_PARSER_REVISION,
            source: parsed.source,
          };
          graph.addNode(node);
          nodes.push(node);
          parsedEntities.push({ node, parsed });
          indexedFiles += 1;
        } else {
          parseFailures.push({
            relativePath: file.relativePath,
            kind: "entity",
            reason: "Entity definition has no identifier.",
          });
        }
      } catch (error) {
        parseFailures.push({
          relativePath: file.relativePath,
          kind: "entity",
          reason:
            error instanceof Error
              ? error.message
              : String(error),
        });
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

    relevantFiles += 1;

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
      ...(file.contentHash === undefined
        ? {}
        : { contentHash: file.contentHash }),
      parserVersion:
        MCSTRUCTURE_PARSER_REVISION,
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
      indexedFiles += 1;

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
      parseFailures.push({
        relativePath: file.relativePath,
        kind: "structure",
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      });
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
    coverage: {
      relevantFiles,
      indexedFiles,
      parseFailures: [...parseFailures]
        .sort((a, b) =>
          a.relativePath.localeCompare(b.relativePath) ||
          a.kind.localeCompare(b.kind)
        ),
      complete:
        parseFailures.length === 0 &&
        indexedFiles === relevantFiles,
    },
  };
}
