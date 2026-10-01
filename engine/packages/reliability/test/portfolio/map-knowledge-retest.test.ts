import { describe, expect, it } from "vitest";
import {
  planRetestWithKnowledge,
} from "../../src/regression/retest-planner.js";

const fingerprint = {
  schemaVersion: 1 as const,
  mapId: "map-a",
  minEngineVersions: [],
  editions: ["education"],
  experiments: [],
  commandVerbs: [],
  scriptModules: [],
  capabilityTags: ["entity-ai"],
  domains: ["entities" as const],
  structures: { count: 0, parsed: 0 },
  worldDatabasePresent: false,
  riskSurfaces: [],
};

const delta = {
  fromVersion: "1.26.20",
  toVersion: "1.26.30",
  entries: [{
    id: "entity-change",
    kind: "behavior-changed" as const,
    domain: "entities" as const,
    capabilityTags: ["entity-ai"],
    affectedIdentifiers: ["entity"],
    summary: "Entity behavior changed.",
    source: "official",
    confidence: "documented" as const,
  }],
};

const regressions = [
  {
    id: "reg:owned",
    title: "Owned regression",
    domain: "entities" as const,
    discoveredBy: "manual" as const,
    invariantIds: ["entity.route"],
    triggerTags: ["navigation"],
    capabilityTags: ["entity-ai"],
    reproduction: ["run"],
    expected: "reaches target",
    observed: "stuck",
  },
  {
    id: "reg:other-map",
    title: "Other map regression",
    domain: "entities" as const,
    discoveredBy: "manual" as const,
    invariantIds: ["entity.other"],
    triggerTags: ["spawn"],
    capabilityTags: ["entity-ai"],
    reproduction: ["run"],
    expected: "stable",
    observed: "unstable",
  },
];

const knowledge = {
  schemaVersion: 1 as const,
  mapId: "map-a",
  label: "Map A",
  editions: ["education"],
  evidenceBasis: "historical-regression" as const,
  evidenceRefs: ["reg:owned"],
  architectureTags: ["arena"],
  gameplayPatternTags: ["waves"],
  capabilityTags: ["entity-ai"],
  domains: ["entities" as const],
  riskSurfaces: ["navigation"],
  invariantIds: ["entity.route"],
  regressionIds: ["reg:owned"],
  failurePatternIds: ["entity-route"],
};

const patterns = [{
  id: "entity-route",
  title: "Entity route failure",
  domain: "entities" as const,
  summary: "Entity cannot converge.",
  invariantIds: ["entity.route"],
  triggerTags: ["navigation"],
  capabilityTags: ["entity-ai"],
  supportingRegressionIds: ["reg:owned"],
  detectionHints: ["observe route"],
  retestFocus: ["repeat wave"],
}];

describe("knowledge-aware retest planning", () => {
  it("scopes historical regressions to the map and adds explicit cross-map patterns", () => {
    const plan = planRetestWithKnowledge(
      fingerprint,
      delta,
      regressions,
      [],
      knowledge,
      patterns,
    );

    expect(
      plan.reasons.some((item) =>
        item.detail.includes("reg:owned")
      ),
    ).toBe(true);
    expect(
      plan.reasons.some((item) =>
        item.detail.includes("reg:other-map")
      ),
    ).toBe(false);
    expect(
      plan.reasons.some((item) =>
        item.kind === "causal-regression" &&
        item.detail.includes("entity-route")
      ),
    ).toBe(true);
  });
});
