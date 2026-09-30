import type {
  ScriptLifecycleProjectGraph,
} from "./terminal-lifecycle-project.js";

export interface TerminalReleaseProof {
  status: "proven" | "violated" | "unknown";
  terminalRegions: readonly string[];
  releaseRegions: readonly string[];
  violatingRegions: readonly string[];
  unknownRegions: readonly string[];
  reasons: readonly string[];
}

function functionName(region: string): string | undefined {
  const marker = "#function:";
  const qualified = region.lastIndexOf(marker);
  if (qualified >= 0) {
    return region.slice(qualified + marker.length);
  }
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

  const regions = new Set<string>();
  for (const edge of graph.callEdges) {
    regions.add(edge.callerRegion);
    regions.add(edge.targetRegion);
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
      unknownRegions: terminalRegions,
      reasons: [
        terminalRegions.length === 0
          ? "No terminal function regions were established."
          : "No release/cleanup function regions were established.",
      ],
    };
  }

  const outgoing = new Map<
    string,
    ScriptLifecycleProjectGraph["callEdges"][number][]
  >();
  for (const edge of graph.callEdges) {
    const list = outgoing.get(edge.callerRegion) ?? [];
    list.push(edge);
    outgoing.set(edge.callerRegion, list);
  }

  const memo = new Map<
    string,
    "guaranteed" | "not-guaranteed" | "unknown"
  >();

  const evaluate = (
    region: string,
    stack = new Set<string>(),
  ): "guaranteed" | "not-guaranteed" | "unknown" => {
    if (releaseRegions.has(region)) {
      return "guaranteed";
    }

    const cached = memo.get(region);
    if (cached) return cached;

    if (stack.has(region)) {
      return "unknown";
    }

    const nextStack = new Set(stack);
    nextStack.add(region);

    const edges = outgoing.get(region) ?? [];
    if (edges.length === 0) {
      memo.set(region, "not-guaranteed");
      return "not-guaranteed";
    }

    const unconditional = edges.filter(
      (edge) => edge.controlFlow === "unconditional",
    );
    const uncertain = edges.filter(
      (edge) =>
        edge.controlFlow === "conditional" ||
        edge.controlFlow === "deferred" ||
        edge.controlFlow === "unknown",
    );

    // One proven unconditional call to release/cleanup is enough to prove
    // that release is reached along the straight-line execution path.
    for (const edge of unconditional) {
      if (
        evaluate(edge.targetRegion, nextStack) ===
        "guaranteed"
      ) {
        memo.set(region, "guaranteed");
        return "guaranteed";
      }
    }

    if (unconditional.length > 0) {
      const outcomes = unconditional.map((edge) =>
        evaluate(edge.targetRegion, nextStack)
      );
      if (
        outcomes.every((outcome) => outcome === "not-guaranteed") &&
        uncertain.length === 0
      ) {
        memo.set(region, "not-guaranteed");
        return "not-guaranteed";
      }
    }

    // Conditional/deferred/unknown calls cannot prove inevitable release.
    memo.set(region, "unknown");
    return "unknown";
  };

  const violatingRegions: string[] = [];
  const unknownRegions: string[] = [];

  for (const region of terminalRegions) {
    const state = evaluate(region);
    if (state === "not-guaranteed") {
      violatingRegions.push(region);
    } else if (state === "unknown") {
      unknownRegions.push(region);
    }
  }

  const status =
    violatingRegions.length > 0
      ? "violated"
      : unknownRegions.length > 0
        ? "unknown"
        : "proven";

  return {
    status,
    terminalRegions,
    releaseRegions: [...releaseRegions].sort(),
    violatingRegions: violatingRegions.sort(),
    unknownRegions: unknownRegions.sort(),
    reasons:
      status === "proven"
        ? [
            "Every modeled terminal function has an unconditional call path that proves release/cleanup is reached.",
          ]
        : status === "violated"
          ? [
              "At least one modeled terminal function has only non-release straight-line continuations.",
            ]
          : [
              "Release may exist only behind conditional, deferred, cyclic, or otherwise unresolved call paths; runtime or stronger control-flow proof is required.",
            ],
  };
}
