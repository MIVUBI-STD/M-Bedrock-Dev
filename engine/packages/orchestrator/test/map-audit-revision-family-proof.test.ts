import { describe, expect, it } from "vitest";
import {
  deriveSelectedMapAuditRevision,
} from "../src/map-audit-revision.js";

describe("selected-map audit revision freshness", () => {
  it("changes when family proof changes", () => {
    const base: any = {
      identity: {
        artifactId: "artifact",
        artifactFingerprint: "fingerprint",
      },
      admission: {
        policy: "selected-map-audit-ordered-admission",
        status: "READY",
        issues: [],
      },
      procedure: {
        status: "CLOSED",
        blockingCheckpointIds: [],
        checkpoints: [],
      },
      graph: {
        scenarios: [],
        causalLinks: [],
        knowledgeReceipts: [],
      },
      defectResolution: {
        resolutions: [{
          causalLinkId: "link:1",
          disposition: "CONFIRMED_DEFECT_READY",
          familyProof: {
            schemaVersion: 1,
            policy: "family-proof-receipt",
            failureDomain: "state-ownership",
            criteria: [{
              id: "state-owner-grounded",
              satisfied: false,
              evidenceIds: [],
            }],
          },
        }],
      },
    };

    const before = deriveSelectedMapAuditRevision(base);
    const after = deriveSelectedMapAuditRevision({
      ...base,
      defectResolution: {
        resolutions: [{
          ...base.defectResolution.resolutions[0],
          familyProof: {
            ...base.defectResolution.resolutions[0].familyProof,
            criteria: [{
              id: "state-owner-grounded",
              satisfied: true,
              evidenceIds: ["e:owner"],
            }],
          },
        }],
      },
    });

    expect(after).not.toBe(before);
  });
});
