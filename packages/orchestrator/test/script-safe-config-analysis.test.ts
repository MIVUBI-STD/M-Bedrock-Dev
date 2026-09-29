import { describe, expect, it } from "vitest";
import type { ParsedScriptFile } from "../../../analyzers/scripts/src/index.js";
import { compileScriptSafeConfig } from "../../../analyzers/scripts/src/index.js";
import { analyzeScriptSafeConfig } from "../src/script-safe-config-analysis.js";

function parsed(identifier: string, text: string): ParsedScriptFile {
  const source = {
    artifactId: "fixture",
    relativePath: `scripts/${identifier}.ts`,
  };
  const safe = compileScriptSafeConfig(text, source);
  return {
    identifier,
    source,
    imports: [],
    events: [],
    dynamicProperties: [],
    restrictedMutations: [],
    deferredCallbacks: [],
    localFunctionCalls: [],
    blockMatchGuards: [],
    methodCalls: [],
    propertyAccesses: [],
    propertyWrites: [],
    entityEventTriggers: [],
    commandLiterals: [],
    lifecycleMemberExposures: [],
    moduleMemberAccesses: [],
    importedSymbols: [],
    enumValueComparisons: [],
    safeConfigBindings: [...safe.bindings],
    safeConfigRejected: [...safe.rejected],
    capabilities: [],
  };
}

describe("script safe config analysis", () => {
  it("resolves a consistent explicit arena count", () => {
    const result = analyzeScriptSafeConfig([
      parsed("a", "const ARENA_COUNT = 3 + 3;"),
      parsed("b", "const MAX_ARENAS = 6;"),
    ]);

    expect(result.resolvedArenaCount).toBe(6);
    expect(result.arenaCountConflict).toBe(false);
  });

  it("keeps conflicting arena counts unresolved", () => {
    const result = analyzeScriptSafeConfig([
      parsed("a", "const ARENA_COUNT = 6;"),
      parsed("b", "const MAX_ARENAS = 5;"),
    ]);

    expect(result.resolvedArenaCount).toBeUndefined();
    expect(result.arenaCountConflict).toBe(true);
  });
});
