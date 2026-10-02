import { describe, expect, it } from "vitest";
import {
  buildEngineeringAnalysis,
  evaluateUpperBoundConstraint,
  renderEngineeringAnalysis,
} from "../src/index.js";

describe("engineering analysis", () => {
  it("combines root cause, constraints, evidence convergence, alternatives, and verification", () => {
    const constraint = evaluateUpperBoundConstraint({
      id: "chunks",
      expression: "whole arena coverage must fit the platform chunk limit",
      observedValue: 165,
      limitValue: 100,
      unit: "chunks",
      evidenceIds: ["world:arena-footprint", "platform:limit"],
    });

    const analysis = buildEngineeringAnalysis({
      symptom: "Only two arenas can run concurrently.",
      immediateCause: "Global admission caps active arenas at two.",
      rootCause: "Concurrency design and chunk residency strategy are coupled.",
      gameplayConsequence: "Teams three and beyond are queued.",
      designContradiction: "Six independent arenas are exposed but only two sessions can run.",
      evidenceChannels: [
        {
          channel: "source",
          evidenceIds: ["source:max-concurrent"],
          statement: "The active-arena cap is 2.",
        },
        {
          channel: "player-feedback",
          evidenceIds: ["feedback:first-in-queue"],
          statement: "Players are shown 1st in queue.",
        },
      ],
      constraints: [constraint],
      alternatives: [
        {
          id: "npc-zones",
          summary: "Use smaller residency zones around active NPC paths.",
          resolves: ["chunk budget", "multi-arena concurrency"],
        },
      ],
      verification: [
        "Start all arena sessions simultaneously.",
        "Verify NPC waves continue without nearby players.",
      ],
    });

    expect(analysis.convergence).toBe("multi-source");
    expect(constraint.satisfied).toBe(false);
    const rendered = renderEngineeringAnalysis(analysis);
    expect(rendered).toMatch(/Root Cause/);
    expect(rendered).toMatch(/165 chunks vs limit 100 chunks/);
    expect(rendered).toMatch(/Evidence Convergence/);
    expect(rendered).toMatch(/Repair Directions/);
  });
});
