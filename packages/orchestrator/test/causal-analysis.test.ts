import { describe, expect, it } from "vitest";
import type { DiagnosticFinding } from "../../diagnostics/src/types.js";
import { synthesizeCausalChains } from "../src/causal-analysis.js";

function finding(
  code: "KNOWLEDGE_RELATION_VIOLATION" | "KNOWLEDGE_EVIDENCE_GAP",
): DiagnosticFinding {
  return {
    id: "diag-1",
    code,
    severity: code === "KNOWLEDGE_RELATION_VIOLATION" ? "critical" : "info",
    message: "route-affecting-world-mutation requires route-revalidation",
    data: {
      scopeKey: "operation:1",
      relationId: "route-revalidation",
      subject: "route-affecting-world-mutation",
      object: "route-revalidation",
      causalConsequences: [
        "navigation-stall-risk",
        "fallback-recovery-risk",
      ],
    },
  };
}

describe("causal chain synthesis", () => {
  it("builds a high-confidence dependency chain from an explicit violation", () => {
    const chains = synthesizeCausalChains([
      finding("KNOWLEDGE_RELATION_VIOLATION"),
    ]);

    expect(chains).toHaveLength(1);
    expect(chains[0]?.confidence).toBe("high");
    expect(chains[0]?.severity).toBe("critical");
    expect(chains[0]?.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "observed-state",
        label: "route-affecting-world-mutation",
      }),
      expect.objectContaining({
        kind: "missing-requirement",
        label: "route-revalidation",
      }),
      expect.objectContaining({
        kind: "downstream-risk",
        label: "navigation-stall-risk",
      }),
    ]));
    expect(chains[0]?.links.some(
      (link) => link.strength === "risk-only",
    )).toBe(true);
  });

  it("keeps an evidence-gap causal chain low confidence", () => {
    const chains = synthesizeCausalChains([
      finding("KNOWLEDGE_EVIDENCE_GAP"),
    ]);

    expect(chains[0]?.confidence).toBe("low");
    expect(chains[0]?.nodes.some(
      (node) => node.kind === "evidence-gap",
    )).toBe(true);
    expect(chains[0]?.nodes.some(
      (node) => node.kind === "downstream-risk",
    )).toBe(true);
  });

  it("raises an evidence-gap chain to medium confidence only with scoped corroborators", () => {
    const item = finding("KNOWLEDGE_EVIDENCE_GAP");
    item.data = {
      ...item.data,
      presentPredicates: [
        "route-affecting-world-mutation",
        "route-navigation-consumer-present",
      ],
      causalCorroborators: {
        "navigation-stall-risk": [
          "route-navigation-consumer-present",
        ],
      },
    };

    const chains = synthesizeCausalChains([item]);
    expect(chains[0]?.confidence).toBe("medium");
    expect(chains[0]?.links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        strength: "corroborated-risk",
      }),
    ]));
  });

  it("does not synthesize risk chains without explicit consequence metadata", () => {
    const item = finding("KNOWLEDGE_RELATION_VIOLATION");
    item.data = {
      ...item.data,
      causalConsequences: [],
    };
    expect(synthesizeCausalChains([item])).toEqual([]);
  });
});
