import type { ParsedScriptFile } from "../../scripts/src/types.js";
import type { SemanticNode } from "../../../packages/graph/src/index.js";
import { SemanticGraph } from "../../../packages/graph/src/index.js";
import { resolveByIdentifier } from "./resolve.js";

export function populateScriptEdges(
  graph: SemanticGraph,
  sourceNode: SemanticNode,
  parsed: ParsedScriptFile,
  candidateNodes: readonly SemanticNode[],
): void {
  for (const imported of parsed.imports) {
    if (imported.kind === "minecraft") {
      graph.addEdge({
        from: sourceNode.id,
        type: "IMPORTS_MINECRAFT_MODULE",
        targetIdentifier: imported.module,
        status: "unresolved",
        evidence: { source: imported.source },
      });
      continue;
    }

    if (imported.kind !== "relative") continue;

    const candidates = candidateNodes.filter((node) => node.kind === "script_file");
    const normalized = imported.module.replace(/^\.\//, "");
    const exact = candidates.filter((node) =>
      node.identifier === normalized ||
      node.identifier.endsWith("/" + normalized),
    );

    const resolution = resolveByIdentifier(exact, exact[0]?.identifier ?? normalized);
    const edge = {
      from: sourceNode.id,
      type: "IMPORTS_SCRIPT" as const,
      targetIdentifier: imported.module,
      status: resolution.status,
      evidence: { source: imported.source },
      ...(resolution.to ? { to: resolution.to } : {}),
      ...(resolution.candidates ? { candidates: resolution.candidates } : {}),
    };

    graph.addEdge(edge);
  }
}
