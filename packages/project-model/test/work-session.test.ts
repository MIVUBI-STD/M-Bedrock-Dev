import {
  describe,
  expect,
  it,
} from "vitest";
import {
  advanceWorkSessionCheckpoint,
  createWorkSessionCheckpoint,
  workSessionIsBlocked,
} from "../src/work-session.js";

describe("work session checkpoint", () => {
  it("advances monotonically while accumulating references", () => {
    const created =
      createWorkSessionCheckpoint({
        sessionId: "session:1",
        goal: "diagnose arena",
        artifact: {
          artifactId: "map",
          artifactFingerprint: "fp",
        },
      });

    const understood =
      advanceWorkSessionCheckpoint(
        created,
        {
          stage: "understood",
          semanticNodeIds: [
            "node:arena",
          ],
          nextActions: [
            "collect runtime evidence",
          ],
        },
      );

    expect(understood.revision)
      .toBe(2);
    expect(
      understood.references
        .semanticNodeIds,
    ).toEqual(["node:arena"]);
  });

  it("rejects silent artifact rebasing", () => {
    const created =
      createWorkSessionCheckpoint({
        sessionId: "session:1",
        goal: "diagnose arena",
        artifact: {
          artifactId: "map",
          artifactFingerprint: "fp",
        },
      });

    expect(() =>
      advanceWorkSessionCheckpoint(
        created,
        {
          stage: "understood",
          artifactFingerprint:
            "different",
        },
      )
    ).toThrow(/fingerprint changed/);
  });

  it("keeps blockers separate from lifecycle progress", () => {
    const created =
      createWorkSessionCheckpoint({
        sessionId: "session:blocked",
        goal: "diagnose arena",
        artifact: {
          artifactId: "map",
          artifactFingerprint: "fp",
        },
        blockers: [
          "runtime evidence required",
        ],
      });

    expect(created.stage)
      .toBe("new");
    expect(
      workSessionIsBlocked(
        created,
      ),
    ).toBe(true);

    const stillNew =
      advanceWorkSessionCheckpoint(
        created,
        {
          stage: "new",
          blockers: [],
        },
      );

    expect(stillNew.stage)
      .toBe("new");
    expect(
      workSessionIsBlocked(
        stillNew,
      ),
    ).toBe(false);
  });

  it("rejects invalid lifecycle jumps", () => {
    const created =
      createWorkSessionCheckpoint({
        sessionId: "session:1",
        goal: "diagnose arena",
        artifact: {
          artifactId: "map",
          artifactFingerprint: "fp",
        },
      });

    expect(() =>
      advanceWorkSessionCheckpoint(
        created,
        {
          stage: "patched",
        },
      )
    ).toThrow(/Invalid work session/);
  });
});
