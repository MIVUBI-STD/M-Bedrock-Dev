import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Map Audit Output V2 naming contract", () => {
  const schema = JSON.parse(
    readFileSync(
      ".agents/schemas/map-audit-output-v2.schema.json",
      "utf8",
    ),
  );

  it("requires the canonical honesty and validation test surfaces", () => {
    expect(schema.required).toEqual(
      expect.arrayContaining([
        "honesty",
        "qualityGates",
        "validationTests",
      ]),
    );
  });

  it("keeps final quality projections bounded and non-authoritative", () => {
    expect(
      schema.properties.qualityGates.properties
        .informationIntegrity.properties.status.enum,
    ).toEqual([
      "CLOSED_CLEAR",
      "CLOSED_WITH_FINDINGS",
      "BLOCKED",
    ]);
    expect(
      schema.properties.qualityGates.properties
        .zeroFinding.properties.status.enum,
    ).toEqual([
      "ELIGIBLE",
      "NOT_ELIGIBLE",
      "NOT_APPLICABLE",
    ]);
  });

  it("requires the vital gameplay closure inside quality gates", () => {
    const vital =
      schema.properties.qualityGates.properties.vitalGameplay;
    expect(
      schema.properties.qualityGates.required,
    ).toContain("vitalGameplay");
    expect(vital.properties.domains.minItems).toBe(8);
    expect(vital.properties.domains.maxItems).toBe(8);
    expect(
      vital.properties.domains.items.properties.status.enum,
    ).toEqual([
      "UNDERSTOOD_PROVEN_SAFE",
      "UNDERSTOOD_WITH_FINDING",
      "RUNTIME_REQUIRED",
      "DETECTION_GAP",
      "NOT_APPLICABLE",
    ]);
  });

  it("keeps NEED_VALIDATION naming aligned with source contracts", () => {
    for (const lane of [
      "bugs",
      "designMismatches",
    ]) {
      const item =
        schema.properties[lane].items;
      expect(item.properties).toHaveProperty(
        "validationGroupKey",
      );
      expect(item.properties).toHaveProperty(
        "proofNavigation",
      );

      const validationRule =
        item.allOf.find(
          (rule: any) =>
            rule?.if?.properties?.status
              ?.const === "NEED_VALIDATION",
        );

      expect(
        validationRule.then.required,
      ).toEqual(
        expect.arrayContaining([
          "validationReason",
          "missingProof",
          "validationTest",
          "validationGroupKey",
          "proofNavigation",
        ]),
      );
    }
  });

  it("uses only canonical full-map replica status names", () => {
    const statuses =
      schema.properties.fullMapReplica
        .properties.replicaResults.items
        .properties.replicaStatus.enum;

    expect(statuses).toEqual([
      "EQUIVALENT",
      "DIVERGENCE_REQUIRES_CLASSIFICATION",
      "INCOMPLETE_PROOF",
    ]);
  });
});
