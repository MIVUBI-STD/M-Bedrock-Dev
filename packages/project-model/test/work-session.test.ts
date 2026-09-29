import {
  describe,
  expect,
  it,
} from "vitest";
import {
  advanceWorkSessionCheckpoint,
  createWorkSessionCheckpoint,
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
        evidenceIds: [],
      } as never);

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
