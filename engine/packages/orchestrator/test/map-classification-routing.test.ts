import {
  describe,
  expect,
  it,
} from "vitest";
import {
  validateMapClassificationRoutingHint,
} from "../src/map-classification-routing.js";

const fingerprint = "a".repeat(64);

const classification = {
  mapType: "COMBAT" as const,
  playerMode: "COOPERATIVE" as const,
  mechanicTags: [
    "MULTI_ARENA" as const,
  ],
  classificationStatus:
    "RESOLVED" as const,
  evidenceRefs: [
    "drive:selected#scripts/main.js",
  ],
};

describe(
  "Map Classification Routing Hint",
  () => {
    it("accepts a resolved classification bound to the selected artifact", () => {
      expect(
        validateMapClassificationRoutingHint(
          {
            artifactFingerprint:
              "sha256:" + fingerprint,
            classification,
          },
          fingerprint,
        ),
      ).toEqual([]);
    });

    it("rejects stale classification from another artifact", () => {
      expect(
        validateMapClassificationRoutingHint(
          {
            artifactFingerprint:
              "b".repeat(64),
            classification,
          },
          fingerprint,
        ).join(" "),
      ).toMatch(/does not match/);
    });

    it("rejects unresolved classification as audit routing input", () => {
      expect(
        validateMapClassificationRoutingHint(
          {
            artifactFingerprint:
              fingerprint,
            classification: {
              ...classification,
              mapType: null,
              playerMode: null,
              classificationStatus:
                "UNRESOLVED",
            },
          },
          fingerprint,
        ).join(" "),
      ).toMatch(/RESOLVED/);
    });
  },
);
