import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";

function decodePermutation(expression: string | undefined) {
  if (!expression) return undefined;
  const match = /^BlockPermutation\.resolve\(\s*(['"])([^'"]+)\1\s*,\s*(\{[\s\S]*\})\s*\)$/.exec(expression.trim());
  if (!match) return undefined;
  const stateText = match[3]!;
  const states: Record<string, string | number | boolean> = {};
  const entry = /(['"]?)([A-Za-z0-9_:.-]+)\1\s*:\s*(true|false|-?\d+(?:\.\d+)?|['"][^'"]*['"])/g;
  let current: RegExpExecArray | null;
  while ((current = entry.exec(stateText)) !== null) {
    const raw = current[3]!;
    states[current[2]!] =
      raw === "true" ? true :
      raw === "false" ? false :
      /^-?\d/.test(raw) ? Number(raw) :
      raw.slice(1, -1);
  }
  return { typeId: match[2]!, states };
}

export function analyzeInteractiveBlockState(
  scripts: readonly ParsedScriptFile[],
) {
  const mutations = scripts.flatMap((script) =>
    (script.spatialWorldMutations ?? []).map((mutation) => {
      const decoded = decodePermutation(mutation.permutationExpression);
      return {
        scriptId: script.identifier,
        method: mutation.method,
        status: mutation.status,
        typeIdentity: mutation.writeIdentity ?? decoded?.typeId,
        permutationExpression: mutation.permutationExpression,
        permutationStates: decoded?.states,
        stateEvidence:
          mutation.method === "setBlockPermutation"
            ? decoded === undefined
              ? "explicit-permutation" as const
              : "decoded-permutation" as const
            : mutation.writeIdentity === undefined
              ? "unresolved" as const
              : "type-only" as const,
        source: mutation.source,
      };
    })
  );
  return {
    mutations,
    typeOnlyWrites: mutations.filter((item) => item.stateEvidence === "type-only").length,
    explicitPermutationWrites: mutations.filter((item) => item.stateEvidence === "explicit-permutation").length,
    decodedPermutationWrites: mutations.filter((item) => item.stateEvidence === "decoded-permutation").length,
    unresolvedStateWrites: mutations.filter((item) => item.stateEvidence === "unresolved").length,
    containerRuntimeStatus:
      mutations.length > 0 ? "runtime-verification-required" as const : "not-applicable" as const,
  };
}

export function assessAuthoredDoorState(
  analysis: ReturnType<typeof analyzeInteractiveBlockState>,
) {
  const doors = analysis.mutations.filter((item) =>
    item.typeIdentity !== undefined &&
    /(?:door|fence_gate|trapdoor)$/i.test(item.typeIdentity)
  );
  return doors.map((item) => {
    const states = item.permutationStates;
    const openValue = states?.open_bit ?? states?.["minecraft:open_bit"];
    return {
      scriptId: item.scriptId,
      typeIdentity: item.typeIdentity!,
      openState:
        openValue === true
          ? "open" as const
          : openValue === false
            ? "closed" as const
            : "unresolved" as const,
      stateEvidence: item.stateEvidence,
      source: item.source,
    };
  });
}
