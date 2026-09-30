import type {
  ScriptLifecycleGraph,
  ScriptLifecycleGraphTransition,
} from "./terminal-lifecycle-graph.js";
import type {
  ScriptLocalFunctionCall,
} from "./types.js";
import type {
  CrossFileCallEdge,
} from "./cross-file-call.js";

export interface ScriptLifecycleProjectInput {
  fileId: string;
  graph: ScriptLifecycleGraph;
  localFunctionCalls: readonly ScriptLocalFunctionCall[];
}

export interface ScriptLifecycleProjectGraph {
  transitions: readonly ScriptLifecycleGraphTransition[];
  callEdges: readonly {
    callerRegion: string;
    targetRegion: string;
    targetName: string;
    controlFlow: "unconditional" | "conditional" | "deferred" | "unknown";
  }[];
  reachableReleaseFunctions: readonly string[];
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

function qualifiedRegion(
  modulePath: string,
  region: string,
): string {
  return "module:" + modulePath + "#" + region;
}

export function composeScriptLifecycleProjectGraph(
  inputs: readonly ScriptLifecycleProjectInput[],
  releaseFunctionPattern: RegExp =
    /(?:release|cleanup|reset|finish|finalize)/i,
): ScriptLifecycleProjectGraph {
  const transitions =
    inputs.flatMap((item) => item.graph.transitions);
  const callEdges =
    inputs.flatMap((item) =>
      item.localFunctionCalls.map((call) => ({
        callerRegion: call.callerRegion,
        targetRegion: call.targetRegion,
        targetName: call.targetName,
        controlFlow: call.controlFlow ?? "unknown",
      }))
    );

  const adjacency = new Map<string, string[]>();
  for (const edge of callEdges) {
    const list = adjacency.get(edge.callerRegion) ?? [];
    list.push(edge.targetRegion);
    adjacency.set(edge.callerRegion, list);
  }

  const releaseRegions = new Set(
    callEdges
      .map((edge) => edge.targetRegion)
      .filter((region) => {
        const name = functionName(region);
        return Boolean(name && releaseFunctionPattern.test(name));
      }),
  );

  const reachableReleaseFunctions = new Set<string>();
  for (const start of adjacency.keys()) {
    const queue = [start];
    const seen = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (seen.has(current)) continue;
      seen.add(current);
      if (releaseRegions.has(current)) {
        reachableReleaseFunctions.add(current);
      }
      for (const next of adjacency.get(current) ?? []) {
        queue.push(next);
      }
    }
  }

  return {
    transitions,
    callEdges,
    reachableReleaseFunctions:
      [...reachableReleaseFunctions].sort(),
  };
}


export function composeQualifiedScriptLifecycleProjectGraph(
  inputs: readonly ScriptLifecycleProjectInput[],
  crossFileCalls: readonly CrossFileCallEdge[],
  releaseFunctionPattern: RegExp =
    /(?:release|cleanup|reset|finish|finalize)/i,
): ScriptLifecycleProjectGraph {
  const transitions =
    inputs.flatMap((item) => item.graph.transitions);

  const localEdges =
    inputs.flatMap((item) =>
      item.localFunctionCalls.map((call) => ({
        callerRegion:
          qualifiedRegion(
            item.fileId,
            call.callerRegion,
          ),
        targetRegion:
          qualifiedRegion(
            item.fileId,
            call.targetRegion,
          ),
        targetName: call.targetName,
        controlFlow:
          call.controlFlow ?? "unknown" as const,
      }))
    );

  const externalEdges =
    crossFileCalls.map((call) => ({
      callerRegion:
        qualifiedRegion(
          call.callerModule,
          call.callerRegion,
        ),
      targetRegion:
        call.status === "resolved" &&
        call.targetModule !== undefined
          ? qualifiedRegion(
              call.targetModule,
              "function:" + call.targetExport,
            )
          : "unresolved:" +
            call.callerModule +
            "->" +
            call.targetExport,
      targetName: call.targetExport,
      controlFlow: call.controlFlow,
    }));

  const callEdges = [
    ...localEdges,
    ...externalEdges,
  ];

  const adjacency = new Map<string, string[]>();
  for (const edge of callEdges) {
    const list =
      adjacency.get(edge.callerRegion) ?? [];
    list.push(edge.targetRegion);
    adjacency.set(edge.callerRegion, list);
  }

  const releaseRegions = new Set(
    callEdges
      .map((edge) => edge.targetRegion)
      .filter((region) => {
        const name = functionName(region);
        return Boolean(
          name &&
          releaseFunctionPattern.test(name),
        );
      }),
  );

  const reachableReleaseFunctions =
    new Set<string>();

  for (const start of adjacency.keys()) {
    const queue = [start];
    const seen = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (seen.has(current)) continue;
      seen.add(current);
      if (releaseRegions.has(current)) {
        reachableReleaseFunctions.add(current);
      }
      for (
        const next of
          adjacency.get(current) ?? []
      ) {
        queue.push(next);
      }
    }
  }

  return {
    transitions,
    callEdges,
    reachableReleaseFunctions:
      [...reachableReleaseFunctions].sort(),
  };
}
