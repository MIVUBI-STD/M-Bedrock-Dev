import { compareVersions } from "../../knowledge/src/version.js";
import type { ScriptApiTrack } from "./script-api.js";
import type { ScriptArgumentKind, ScriptMethodCall } from "../../../analyzers/scripts/src/types.js";

export interface ScriptCallShape {
  minArgs: number;
  maxArgs: number;
  argumentKinds?: readonly (readonly ScriptArgumentKind[] | "any")[];
}

export interface ScriptSignatureTransitionRule {
  id: string;
  moduleName: "@minecraft/server";
  symbol: string;
  transitionIn: string;
  before: ScriptCallShape;
  after: ScriptCallShape;
  severity: "medium" | "critical";
  sourceIds: readonly string[];
  summary: string;
}

export const SCRIPT_SIGNATURE_RULES: readonly ScriptSignatureTransitionRule[] = [
  {
    id: "script-signature.entity.apply-knockback-2.0",
    moduleName: "@minecraft/server",
    symbol: "Entity.applyKnockback",
    transitionIn: "2.0.0",
    before: {
      minArgs: 4,
      maxArgs: 4,
      argumentKinds: [
        ["number"],
        ["number"],
        ["number"],
        ["number"],
      ],
    },
    after: {
      minArgs: 2,
      maxArgs: 2,
      argumentKinds: [
        ["object", "identifier", "property", "call"],
        ["number", "identifier", "property", "call"],
      ],
    },
    severity: "critical",
    sourceIds: [
      "ms-entity-1xx",
      "ms-server-changelog",
      "ms-entity-current",
    ],
    summary:
      "Entity.applyKnockback changed from four numeric arguments to horizontalForce VectorXZ plus verticalStrength in @minecraft/server 2.0.0.",
  },
  {
    id: "script-signature.dimension.spawn-entity-options-2.0",
    moduleName: "@minecraft/server",
    symbol: "Dimension.spawnEntity",
    transitionIn: "2.0.0",
    before: {
      minArgs: 2,
      maxArgs: 2,
    },
    after: {
      minArgs: 2,
      maxArgs: 3,
    },
    severity: "medium",
    sourceIds: [
      "ms-dimension-1xx",
      "ms-server-changelog",
      "ms-dimension-current",
    ],
    summary:
      "Dimension.spawnEntity adds the optional options argument in @minecraft/server 2.0.0.",
  },
];

export interface ScriptSignatureCheck {
  compatible: boolean | "unknown";
  expectedPhase: "before" | "after" | "unknown";
  expected?: ScriptCallShape;
  rule?: ScriptSignatureTransitionRule;
  reason: string;
}

export function findScriptSignatureRule(
  symbol: string,
): ScriptSignatureTransitionRule | undefined {
  return SCRIPT_SIGNATURE_RULES.find((item) => item.symbol === symbol);
}

function shapeMatches(
  call: Pick<ScriptMethodCall, "argumentCount" | "argumentKinds" | "hasSpreadArgument">,
  shape: ScriptCallShape,
): boolean | "unknown" {
  if (call.hasSpreadArgument) return "unknown";
  if (call.argumentCount < shape.minArgs || call.argumentCount > shape.maxArgs) {
    return false;
  }

  if (!shape.argumentKinds) return true;

  for (let index = 0; index < shape.argumentKinds.length; index += 1) {
    const expected = shape.argumentKinds[index];
    if (!expected || expected === "any") continue;
    const observed = call.argumentKinds[index];
    if (!observed) return false;
    if (!expected.includes(observed)) return false;
  }
  return true;
}

export function checkScriptMethodSignature(
  call: ScriptMethodCall,
  moduleVersion: string,
  moduleTrack: ScriptApiTrack,
): ScriptSignatureCheck {
  const rule = findScriptSignatureRule(call.symbol);
  if (!rule) {
    return {
      compatible: "unknown",
      expectedPhase: "unknown",
      reason: "No signature transition rule is registered.",
    };
  }

  if (moduleTrack === "unknown") {
    return {
      compatible: "unknown",
      expectedPhase: "unknown",
      rule,
      reason: "The manifest Script API track cannot be classified.",
    };
  }

  const afterTransition = compareVersions(moduleVersion, rule.transitionIn) >= 0;
  const expectedPhase = afterTransition ? "after" : "before";
  const expected = afterTransition ? rule.after : rule.before;
  const compatible = shapeMatches(call, expected);

  return {
    compatible,
    expectedPhase,
    expected,
    rule,
    reason: compatible === true
      ? `${call.symbol} matches the ${expectedPhase}-${rule.transitionIn} call shape.`
      : compatible === false
        ? `${call.symbol} does not match the ${expectedPhase}-${rule.transitionIn} call shape.`
        : "Spread arguments prevent deterministic arity evaluation.",
  };
}
