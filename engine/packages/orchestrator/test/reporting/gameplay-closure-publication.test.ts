import { describe, expect, it } from "vitest";
import {
  gameplayClosurePublicationIssues,
} from "../../src/reporting/report-defect-collector.js";
import type {
  GameplayModelClosureResult,
} from "../../../gameplay-intent/src/index.js";

function closure(
  status: GameplayModelClosureResult["status"],
): GameplayModelClosureResult {
  return {
    status,
    surfaces: [],
    unaccountedSurfaceIds:
      status === "OPEN" ? ["surface:missing"] : [],
    blockingSurfaceIds: [],
    unknownSurfaceIds: [],
    stateModelComplete: status !== "OPEN",
    boundariesExtracted: true,
    reasons: [],
  };
}

describe("gameplay closure publication gate", () => {
  it("blocks comprehensive publication while closure is OPEN", () => {
    const issues =
      gameplayClosurePublicationIssues(
        closure("OPEN"),
      );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(
      /closure is OPEN/i,
    );
  });

  it("allows publication gate to proceed for CLOSED or PARTIAL closure", () => {
    expect(
      gameplayClosurePublicationIssues(
        closure("CLOSED"),
      ),
    ).toEqual([]);
    expect(
      gameplayClosurePublicationIssues(
        closure("PARTIAL"),
      ),
    ).toEqual([]);
  });
});
