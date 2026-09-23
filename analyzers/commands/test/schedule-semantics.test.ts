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

  it("parses rectangle scheduling", () => {
    expect(parseScheduleAreaLoadedSemantics(
      "schedule on_area_loaded add 0 60 0 31 80 31 demo:boot",
    )).toEqual({
      kind: "rectangle",
      from: {
        x: { mode: "absolute", value: 0 },
        y: { mode: "absolute", value: 60 },
        z: { mode: "absolute", value: 0 },
      },
      to: {
        x: { mode: "absolute", value: 31 },
        y: { mode: "absolute", value: 80 },
        z: { mode: "absolute", value: 31 },
      },
      functionName: "demo:boot",
    });
  });

  it("retains legacy position scheduling", () => {
    expect(parseScheduleAreaLoadedSemantics(
      "schedule on_area_loaded add 0 64 0 demo:boot",
    )).toMatchObject({
      kind: "position",
      functionName: "demo:boot",
    });
  });
});
