import { describe, expect, it } from "vitest";
import {
  invalidateEvidenceByGraphPlan,
} from "../src/evidence-invalidation.js";

describe("graph evidence invalidation", () => {
  it("stales evidence whose basis intersects changed or affected nodes", () => {
    const result = invalidateEvidenceByGraphPlan(
      {
        changed: new Set(["script:a"]),
        affected: new Set(["diag:b"]),
      },
      [
        {
          evidenceId: "e1",
          basisNodeIds: ["script:a"],
          basisFingerprint: "x",
        },
        {
          evidenceId: "e2",
          basisNodeIds: ["script:c"],
          basisFingerprint: "y",
        },
      ],
    );

    expect(result.staleEvidenceIds).toEqual(["e1"]);
    expect(result.unaffectedEvidenceIds).toEqual(["e2"]);
  });
});
