import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";

export function analyzeInteractiveBlockState(
  scripts: readonly ParsedScriptFile[],
) {
  const mutations = scripts.flatMap((script) =>
    (script.spatialWorldMutations ?? []).map((mutation) => ({
      scriptId: script.identifier,
      method: mutation.method,
      status: mutation.status,
      typeIdentity: mutation.writeIdentity,
      permutationExpression: mutation.permutationExpression,
      stateEvidence:
        mutation.method === "setBlockPermutation"
          ? mutation.permutationExpression === undefined
            ? "unresolved" as const
            : "explicit-permutation" as const
          : mutation.writeIdentity === undefined
            ? "unresolved" as const
            : "type-only" as const,
      source: mutation.source,
    }))
  );
  return {
    mutations,
    typeOnlyWrites: mutations.filter((item) => item.stateEvidence === "type-only").length,
    explicitPermutationWrites: mutations.filter((item) => item.stateEvidence === "explicit-permutation").length,
    unresolvedStateWrites: mutations.filter((item) => item.stateEvidence === "unresolved").length,
    containerRuntimeStatus:
      mutations.length > 0 ? "runtime-verification-required" as const : "not-applicable" as const,
  };
}
