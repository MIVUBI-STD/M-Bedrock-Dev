import type { CommandEffect } from "../../commands/src/index.js";
import { scoreboardAccesses, tagAccesses } from "../../commands/src/index.js";
import { classifySelector, type StateAccess } from "./state-scope.js";

export function stateAccessesFromEffects(
  effects: readonly CommandEffect[],
): StateAccess[] {
  const output: StateAccess[] = [];

  for (const access of scoreboardAccesses(effects)) {
    if (!access.target) continue;
    output.push({
      stateKind: "scoreboard",
      key: access.objective,
      access: access.access,
      selector: access.target,
      selectorScope: classifySelector(access.target),
      ...(access.source ? { source: access.source } : {}),
    });
  }

  for (const access of tagAccesses(effects)) {
    if (!access.target) continue;
    output.push({
      stateKind: "tag",
      key: access.tag,
      access: access.access,
      selector: access.target,
      selectorScope: classifySelector(access.target),
      ...(access.source ? { source: access.source } : {}),
    });
  }

  return output;
}
