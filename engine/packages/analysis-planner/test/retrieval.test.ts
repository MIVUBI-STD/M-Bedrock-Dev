import { describe, expect, it } from "vitest";
import {
  retrieveResources,
  type CatalogResource,
  type GraphEdge,
} from "../src/retrieval.js";

const resources: readonly CatalogResource[] = [
  {
    id: "document.analysis.inventory-runtime",
    class: "DOCUMENT",
    domain: "analysis",
    role: "DOMAIN",
    authority: "CANONICAL",
    path: "docs/analysis/inventory-runtime.md",
    lifecycle: "ACTIVE",
  },
  {
    id: "document.analysis.player-lifecycle",
    class: "DOCUMENT",
    domain: "analysis",
    role: "DOMAIN",
    authority: "CANONICAL",
    path: "docs/analysis/player-lifecycle.md",
    lifecycle: "ACTIVE",
  },
  {
    id: "reliability.system.history",
    class: "RELIABILITY",
    domain: "system",
    authority: "HISTORICAL",
    path: "engine/reliability/history",
    lifecycle: "ACTIVE",
  },
  {
    id: "document.system.retired-note",
    class: "DOCUMENT",
    domain: "system",
    role: "DOMAIN",
    authority: "CANONICAL",
    path: "docs/system/retired-note.md",
    lifecycle: "RETIRED",
  },
];

const edges: readonly GraphEdge[] = [
  {
    from: "document.analysis.player-lifecycle",
    type: "RELATES_TO",
    to: "document.analysis.inventory-runtime",
  },
];

describe("retrieveResources", () => {
  it("keeps routing structural and authority signals explicit", () => {
    const results = retrieveResources(resources, edges, {
      text: "inventory reconnect lifecycle",
      domains: ["analysis"],
      limit: 10,
    });

    expect(results.map((item) => item.resource.id)).toEqual([
      "document.analysis.inventory-runtime",
      "document.analysis.player-lifecycle",
    ]);
    expect(results[0]?.score.routing).toBe(30);
    expect(results[0]?.reasons).toContain("authority:CANONICAL");
  });

  it("uses graph seeds to expand bounded candidates", () => {
    const results = retrieveResources(resources, edges, {
      text: "",
      seedIds: ["document.analysis.player-lifecycle"],
      limit: 10,
    });

    expect(results.map((item) => item.resource.id)).toEqual([
      "document.analysis.player-lifecycle",
      "document.analysis.inventory-runtime",
    ]);
    expect(results[1]?.reasons).toContain("graph-relation");
  });

  it("does not surface unrelated historical data by default routed scope", () => {
    const results = retrieveResources(resources, edges, {
      text: "inventory",
      domains: ["analysis"],
    });

    expect(
      results.some((item) => item.resource.authority === "HISTORICAL"),
    ).toBe(false);
  });

  it("allows historical data only when explicitly requested", () => {
    const results = retrieveResources(resources, edges, {
      text: "",
      includeHistorical: true,
      limit: 50,
    });

    expect(
      results.some((item) => item.resource.authority === "HISTORICAL"),
    ).toBe(true);
  });

  it("never returns retired resources", () => {
    const results = retrieveResources(resources, edges, {
      text: "",
      limit: 50,
    });

    expect(
      results.some((item) => item.resource.lifecycle === "RETIRED"),
    ).toBe(false);
  });
});