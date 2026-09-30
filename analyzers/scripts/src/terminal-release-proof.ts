import type {
  ScriptLifecycleProjectGraph,
} from "./terminal-lifecycle-project.js";

export interface TerminalReleaseProof {
  status: "proven" | "violated" | "unknown";
  terminalRegions: readonly string[];
  releaseRegions: readonly string[];
  violatingRegions: readonly string[];
  reasons: readonly string[];
}

function functionName(region: string): string | undefined {
  return region.startsWith("function:")
    ? region.slice("function:".length)
    : undefined;
}

export function proveInterproceduralTerminalRelease(
  graph: ScriptLifecycleProjectGraph,
  options: {
    terminalFunctionPattern?: RegExp;
    releaseFunctionPattern?: RegExp;
  } = {},
): TerminalReleaseProof {
  const terminalPattern =
    options.terminalFunctionPattern ??
    /(?:finish|finalize|victory|defeat|complete|abort|disconnect|leave)/i;
  const releasePattern =
    options.releaseFunctionPattern ??
    /(?:releasearena|cleanup(?:arena)?|resetarena)/i;

  const adjacency = new Map<string, string[]>();
  const regions = new Set<string>();

  for (const edge of graph.callEdges) {
    regions.add(edge.callerRegion);
    regions.add(edge.targetRegion);
    const list = adjacency.get(edge.callerRegion) ?? [];
    list.push(edge.targetRegion);
    adjacency.set(edge.callerRegion, list);
  }

  const terminalRegions = [...regions]
    .filter((region) => {
      const name = functionName(region);
      return Boolean(name && terminalPattern.test(name));
    })
    .sort();
  const releaseRegions = new Set(
    [...regions].filter((region) => {
      const name = functionName(region);
      return Boolean(name && releasePattern.test(name));
    }),
  );

  if (terminalRegions.length === 0 || releaseRegions.size === 0) {
    return {
      status: "unknown",
      terminalRegions,
      releaseRegions: [...releaseRegions].sort(),
      violatingRegions: [],
      reasons: [
        terminalRegions.length === 0
          ? "No terminal function regions were established."
          : "No release/cleanup function regions were established.",
      ],
    };
  }

  const guaranteed = new Set(releaseRegions);
  let changed = true;
  while (changed) {
    changed = false;
    for (const region of regions) {
      if (guaranteed.has(region)) continue;
      const outgoing = adjacency.get(region) ?? [];
      if (
        outgoing.length > 0 &&
        outgoing.every((target) => guaranteed.has(target))
      ) {
        guaranteed.add(region);
        changed = true;
      }
    }
  }

  const violatingRegions = terminalRegions
    .filter((region) => !guaranteed.has(region))
    .sort();

  return {
    status:
      violatingRegions.length === 0
        ? "proven"
        : "violated",
    terminalRegions,
    releaseRegions: [...releaseRegions].sort(),
    violatingRegions,
    reasons:
      violatingRegions.length === 0
        ? [
            "Every modeled terminal function has only continuations that inevitably reach a release/cleanup function.",
          ]
        : [
            "At least one modeled terminal function has a call path that does not inevitably reach release/cleanup.",
          ],
  };
}
