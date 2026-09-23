import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../scripts/src/parse.js";
import { scriptImportedTypeLifecycleDiagnostics } from "../src/script-type-findings.js";

const source = {
  artifactId: "fixture",
  relativePath: "scripts/main.ts",
};

describe("script imported type lifecycle diagnostics", () => {
  it("flags deprecated prior types on 1.x", () => {
    const script = parseScriptFile(
      "scripts/main",
      'import type { WorldInitializeBeforeEvent } from "@minecraft/server";',
      source,
    );

    expect(scriptImportedTypeLifecycleDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "1.19.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script])).toEqual([
      expect.objectContaining({
        code: "SCRIPT_API_DEPRECATED_SYMBOL",
        severity: "minor",
        data: expect.objectContaining({
          symbol: "WorldInitializeBeforeEvent",
          symbolKind: "type",
          typeOnlyImport: true,
        }),
      }),
    ]);
  });

  it("flags removed namespace-qualified types on 2.x", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import * as mc from "@minecraft/server";
        type Init = mc.WorldInitializeAfterEvent;
      `,
      source,
    );

    expect(scriptImportedTypeLifecycleDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "2.0.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script])).toEqual([
      expect.objectContaining({
        code: "SCRIPT_API_REMOVED_SYMBOL",
        severity: "critical",
        data: expect.objectContaining({
          symbol: "WorldInitializeAfterEvent",
          symbolKind: "type",
        }),
      }),
    ]);
  });
});
