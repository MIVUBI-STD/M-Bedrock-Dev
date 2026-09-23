import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";

export type SelectorScope = "self" | "nearest" | "all_players" | "all_entities" | "filtered" | "unknown";

export interface StateAccess {
  stateKind: "scoreboard" | "tag";
  key: string;
  access: "read" | "write";
  selector: string;
  selectorScope: SelectorScope;
  source?: SourceRef;
}

export function classifySelector(selector: string): SelectorScope {
  if (selector === "@s") return "self";
  if (selector === "@p") return "nearest";
  if (selector === "@a") return "all_players";
  if (selector === "@e") return "all_entities";
  if (/^@[pares]\[.+\]$/i.test(selector)) return "filtered";
  return "unknown";
}

export function likelyGlobalAccess(access: StateAccess): boolean {
  return access.selectorScope === "all_players" || access.selectorScope === "all_entities";
}
