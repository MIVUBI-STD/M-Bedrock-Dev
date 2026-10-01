import { ddmin } from "./minimize.js";

export interface GraphFixtureNode<T> {
  id: string;
  value: T;
}

export interface GraphMinimizeResult<T> {
  nodes: GraphFixtureNode<T>[];
  evaluations: number;
  originalNodes: number;
  minimizedNodes: number;
}

export async function minimizeGraphFixture<T>(
  nodes: readonly GraphFixtureNode<T>[],
  stillFails: (candidate: readonly GraphFixtureNode<T>[]) => boolean | Promise<boolean>,
): Promise<GraphMinimizeResult<T>> {
  const result = await ddmin(nodes, stillFails);
  return {
    nodes: result.minimized,
    evaluations: result.evaluations,
    originalNodes: result.originalLength,
    minimizedNodes: result.minimizedLength,
  };
}
