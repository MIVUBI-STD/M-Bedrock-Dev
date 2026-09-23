import { describe, expect, it } from "vitest";
import { parseScheduleAreaLoadedSemantics } from "../src/schedule-semantics.js";

describe("schedule on_area_loaded semantics", () => {
  it("parses ticking-area scheduling", () => {
    expect(parseScheduleAreaLoadedSemantics(
      "schedule on_area_loaded tickingarea arena_logic demo:boot",
    )).toEqual({
      kind: "tickingarea",
      tickingAreaName: "arena_logic",
      functionName: "demo:boot",
    });
  });

  it("parses position scheduling", () => {
    expect(parseScheduleAreaLoadedSemantics(
      "schedule on_area_loaded add 0 64 0 demo:boot",
    )).toMatchObject({
      kind: "position",
      functionName: "demo:boot",
    });
  });
});
