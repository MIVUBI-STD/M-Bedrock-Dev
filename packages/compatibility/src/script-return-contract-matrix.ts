import { compareVersions } from "../../knowledge/src/version.js";
import type { ScriptApiTrack } from "./script-api.js";

export type ScriptReturnUse =
  | "ignored"
  | "assigned"
  | "returned"
  | "dereferenced"
  | "optional-dereferenced"
  | "non-null-asserted"
  | "other";

export interface ScriptReturnContractObservation {
  symbol: string;
  resultUse: ScriptReturnUse;
}

export interface ScriptReturnContractRule {
  id: string;
  moduleName: "@minecraft/server";
  symbol: string;
  transitionIn: string;
  before: "required";
  after: "optional";
  sourceIds: readonly string[];
  summary: string;
}

export const SCRIPT_RETURN_CONTRACT_RULES: readonly ScriptReturnContractRule[] = [
  {
    id: "script-return.entity-get-component-1.18",
    moduleName: "@minecraft/server",
    symbol: "Entity.getComponent",
    transitionIn: "1.18.0",
    before: "required",
    after: "optional",
    sourceIds: ["ms-server-changelog", "ms-entity-current"],
    summary:
      "Entity.getComponent changed from EntityComponent to EntityComponentReturnType<T> | undefined in @minecraft/server 1.18.0.",
  },
];

export interface ScriptReturnContractCheck {
  state: "safe" | "risk" | "unknown";
  phase: "before" | "after" | "unknown";
  rule?: ScriptReturnContractRule;
  reason: string;
}

export function findScriptReturnContractRule(
  symbol: string,
): ScriptReturnContractRule | undefined {
  return SCRIPT_RETURN_CONTRACT_RULES.find((item) => item.symbol === symbol);
}

export function checkScriptReturnContract(
  call: ScriptReturnContractObservation,
  moduleVersion: string,
  moduleTrack: ScriptApiTrack,
): ScriptReturnContractCheck {
  const rule = findScriptReturnContractRule(call.symbol);
  if (!rule) {
    return {
      state: "unknown",
      phase: "unknown",
      reason: "No return-contract rule is registered.",
    };
  }

  if (moduleTrack === "unknown") {
    return {
      state: "unknown",
      phase: "unknown",
      rule,
      reason: "The manifest Script API track cannot be classified.",
    };
  }

  const afterTransition = compareVersions(moduleVersion, rule.transitionIn) >= 0;
  const phase = afterTransition ? "after" : "before";

  if (!afterTransition) {
    return {
      state: "safe",
      phase,
      rule,
      reason: "The declared module version predates the optional-return transition.",
    };
  }

  if (call.resultUse === "dereferenced") {
    return {
      state: "risk",
      phase,
      rule,
      reason:
        "The return contract may be undefined at this module version and is dereferenced without an observed optional chain or non-null assertion.",
    };
  }

  if (
    call.resultUse === "optional-dereferenced" ||
    call.resultUse === "non-null-asserted" ||
    call.resultUse === "ignored"
  ) {
    return {
      state: "safe",
      phase,
      rule,
      reason: "The observed use does not directly dereference a possibly undefined result.",
    };
  }

  return {
    state: "unknown",
    phase,
    rule,
    reason:
      "The result escapes the direct call expression; bounded flow analysis does not prove whether it is guarded.",
  };
}
