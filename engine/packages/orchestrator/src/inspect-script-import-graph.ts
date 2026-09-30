import { resolveScriptImports } from "../../../analyzers/scripts/src/index.js";
import type { ParsedScriptFile } from "../../../analyzers/scripts/src/index.js";
import type { SemanticGraph } from "../../graph/src/index.js";
import type { SemanticNode } from "../../graph/src/index.js";

export function populateInspectionScriptImportGraph(
  graph: SemanticGraph,
  parsedScripts: readonly {
    node: SemanticNode;
    parsed: ParsedScriptFile;
  }[],
): void {
  const resolutions = resolveScriptImports(
    parsedScripts.map((item) => item.parsed),
  );
  const nodesByIdentifier = new Map(
    parsedScripts.map((item) => [
      item.parsed.identifier,
      item.node,
    ]),
  );

  for (const resolution of resolutions) {
    const from = nodesByIdentifier.get(
      resolution.fromIdentifier,
    );
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
      ? nodesByIdentifier.get(
          resolution.targetIdentifier,
        )
      : undefined;

    graph.addEdge({
      from: from.id,
      type: "IMPORTS_SCRIPT",
      targetIdentifier: resolution.module,
      status: targetNode
        ? "resolved"
        : "unresolved",
      ...(targetNode ? { to: targetNode.id } : {}),
      evidence: { source: from.source },
    });
  }
}
