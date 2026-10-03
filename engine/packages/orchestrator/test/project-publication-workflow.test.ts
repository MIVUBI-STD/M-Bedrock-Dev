import { describe, expect, it } from "vitest";
import {
  approveAuditProjectAndPersist,
} from "../src/workflow/project-publication-workflow.js";

describe("project audit publication boundary", () => {
  it("keeps audit completion authority in SelectedMapAuditRun", async () => {
    const project: any = {
      schemaVersion: 1,
      projectId: "defense-v2",
      projectName: "Defense V2",
      taskClass: "DIAGNOSE",
      revision: 2,
      artifact: {
        artifactId: "map:defense-v2",
        artifactFingerprint: "sha256:map",
      },
      work: {
        sessionId: "session:1",
        workSessionRevision: 2,
      },
      knowledge: {
        bugReportPath:
          "workspace/reports/Defense-v2-BugReport.json",
      },
      publication: {
        drive: {
          schemaVersion: 1,
          projectId: "defense-v2",
          mapFolder: {
            folderId: "drive-folder",
          },
        },
      },
    };

    await expect(
      approveAuditProjectAndPersist({
        repositoryRoot: "/tmp/repo",
        workspace: {
          root: "/tmp/project",
          source: "/tmp/project/source",
          design: "/tmp/project/design",
          working: "/tmp/project/working",
          output: "/tmp/project/output",
          evidence: "/tmp/project/evidence",
          patches: "/tmp/project/patches",
          state: "/tmp/project/state",
        },
        project,
        deliverables: [{
          kind: "bug-report",
          path:
            "workspace/reports/Defense-v2-BugReport.json",
          fingerprint: "sha256:report",
          destinationRole:
            "project-root",
        }],
        report: {
          schema: "m-bedrock-bug-report/v2",
          map: {
            name: "Defense",
            mapVersion: "2",
            drive:
              "https://drive.google.com/example",
            baseVersion: "2",
            testedVersion: "2",
          },
          repairBy: "developer",
          bugs: [{
            id: "BUG-001",
            fixed: false,
            severity: "major",
            category: "game-flow",
            foundBy: "ai",
            title: "Broken progression",
            problem: "Progression can stop.",
            expected: "Progression completes.",
            observed: "Progression stops.",
          }],
        },
        reportPath:
          "workspace/reports/Defense-v2-BugReport.json",
        audit: {
          currentStage: "PROVE",
          auditRevision: "audit:1",
          identity: {
            artifactFingerprint: "sha256:map",
          },
        } as any,
      }),
    ).rejects.toThrow(
      "Audit project approval requires SelectedMapAuditRun currentStage COMPLETE.",
    );
  });
});
