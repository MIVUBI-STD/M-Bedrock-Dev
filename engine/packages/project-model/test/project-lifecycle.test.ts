import { describe, expect, it } from "vitest";
import {
  normalizeProjectRecord,
  normalizeProjectRegistry,
} from "../src/project/project-lifecycle.js";

function record(): any {
  return {
    schemaVersion: 1,
    projectId: "defense-v2",
    projectName: "Defense V2",
    taskClass: "DIAGNOSE",
    status: "working",
    revision: 1,
    artifact: {
      artifactId: "map:defense-v2",
      artifactFingerprint: "sha256:map",
    },
    work: {},
    knowledge: {
      historicalRegressionIds: [],
      failurePatternIds: [],
      mapKnowledgeIds: [],
    },
    publication: {},
  };
}

describe("project lifecycle contracts", () => {
  it("rejects invalid tracked lifecycle state", () => {
    expect(() =>
      normalizeProjectRecord({
        ...record(),
        status: "done",
      })
    ).toThrow(
      "Unsupported project lifecycle status.",
    );
  });

  it("requires approval proof for approved state", () => {
    expect(() =>
      normalizeProjectRecord({
        ...record(),
        status: "approved",
      })
    ).toThrow(
      "Approved project state requires approvalSnapshotFingerprint.",
    );
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
