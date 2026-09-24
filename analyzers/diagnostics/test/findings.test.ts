import { describe, expect, it } from "vitest";
import { commandEffectDiagnostics } from "../src/command-findings.js";
import { referenceDiagnostics } from "../src/reference-findings.js";
import { analyzeCommand } from "../../commands/src/index.js";
import { flattenCommandEffects } from "../../commands/src/index.js";

const source = { artifactId: "art_demo", relativePath: "functions/demo.mcfunction" };

describe("diagnostics", () => {
  it("turns unresolved edges into findings", () => {
    const findings = referenceDiagnostics([
      {
        id: "edge_1",
        from: "function:p:a",
        type: "LOADS_STRUCTURE",
        targetIdentifier: "missing",
        status: "unresolved",
        evidence: { source },
      },
    ]);

    expect(findings[0]?.code).toBe("UNRESOLVED_REFERENCE");
  });

  it("marks context-dependent relative region mutations", () => {
    const effects = flattenCommandEffects(
      analyzeCommand("execute at @s run fill ~ ~ ~ ~2 ~2 ~2 stone", source),
    );
    const findings = commandEffectDiagnostics(effects);

    expect(findings.some((finding) => finding.code === "SUSPICIOUS_REGION_MUTATION")).toBe(true);
  });
});
