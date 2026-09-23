import { describe, expect, it } from "vitest";
import { buildKnowledgeEvidenceOverlay } from "../src/evidence-overlay.js";

describe("knowledge evidence overlay", () => {
  it("translates runtime state observations into normalized mirror evidence", () => {
    const overlay = buildKnowledgeEvidenceOverlay({
      stateAuthorityContracts: [{
        id: "ready",
        authority: { kind: "scoreboard", key: "ready" },
        mirrors: [{ kind: "tag", key: "ready" }],
      }],
      stateObservations: [{
        surface: { kind: "scoreboard", key: "ready" },
        scopeKey: "player:a",
        value: 1,
        revision: 2,
      }, {
        surface: { kind: "tag", key: "ready" },
        scopeKey: "player:a",
        value: 0,
        revision: 1,
      }],
    });

    expect(overlay.stateMirrorCorrelations[0]?.status).toBe("revision-stale");
    expect(overlay.records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        predicate: "state-authority-observed",
        state: "present",
      }),
      expect.objectContaining({
        predicate: "state-mirror-consistent",
        state: "absent",
      }),
    ]));
  });
});
