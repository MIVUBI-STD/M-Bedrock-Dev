import { describe, expect, it } from "vitest";
import {
  normalizeProjectRecord,
  normalizeProjectRegistry,
  projectLifecycleStatus,
} from "../src/project/project-lifecycle.js";

function record(): any {
  return {
    schemaVersion: 1,
    projectId: "defense-v2",
    projectName: "Defense V2",
    taskClass: "DIAGNOSE",
    revision: 1,
    artifact: {
      artifactId: "map:defense-v2",
      artifactFingerprint:
        "sha256:map",
    },
    work: {},
    knowledge: {},
    publication: {},
  };
}

describe("project lifecycle contracts", () => {
  it("rejects legacy persisted lifecycle status", () => {
    expect(() =>
      normalizeProjectRecord({
        ...record(),
        status: "approved",
      })
    ).toThrow(
      "Project record contains unsupported or legacy fields.",
    );
  });

  it("requires approval proof before publication proof", () => {
    expect(() =>
      normalizeProjectRecord({
        ...record(),
        publication: {
          drivePublishReceiptFingerprint:
            "sha256:publish",
        },
      })
    ).toThrow(
      "Drive publication proof requires approvalSnapshotFingerprint.",
    );
  });

  it("derives lifecycle from proof fingerprints", () => {
    expect(
      projectLifecycleStatus(
        normalizeProjectRecord(
          record(),
        ),
      ),
    ).toBe("working");

    expect(
      projectLifecycleStatus(
        normalizeProjectRecord({
          ...record(),
          publication: {
            approvalSnapshotFingerprint:
              "sha256:approval",
          },
        }),
      ),
    ).toBe("approved");

    expect(
      projectLifecycleStatus(
        normalizeProjectRecord({
          ...record(),
          publication: {
            approvalSnapshotFingerprint:
              "sha256:approval",
            drivePublishReceiptFingerprint:
              "sha256:publish",
          },
        }),
      ),
    ).toBe("drive-published");
  });

  it("rejects duplicate project ids in registry", () => {
    expect(() =>
      normalizeProjectRegistry({
        schemaVersion: 1,
        projects: [
          record(),
          record(),
        ],
      })
    ).toThrow(
      "Project registry contains duplicate projectId",
    );
  });
});
