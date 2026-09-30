import {
  describe,
  expect,
  it,
} from "vitest";
import {
  BUILTIN_TASK_CAPABILITIES,
  createTaskGraph,
  resolveAffectedTasks,
} from "../src/index.js";

describe("builtin task capabilities", () => {
  it("forms an acyclic ownership graph", () => {
    expect(() =>
      createTaskGraph(
        BUILTIN_TASK_CAPABILITIES,
      )
    ).not.toThrow();
  });

  it("keeps inventory evidence changes scoped to inventory, economy, and downstream projections", () => {
    const graph =
      createTaskGraph(
        BUILTIN_TASK_CAPABILITIES,
      );
    const affected =
      resolveAffectedTasks(
        graph,
        [
          "analyzers/scripts/src/inventory-lifecycle-evidence.ts",
        ],
      );

    expect(
      affected.directCapabilityIds,
    ).toEqual([
      "source.scripts.inventory",
    ]);
    expect(
      affected.affectedCapabilityIds,
    ).toEqual(
      expect.arrayContaining([
        "source.scripts.inventory",
        "domain.inventory",
        "domain.economy",
        "projection.world-model",
        "projection.workflow",
        "repair.routing",
        "context.compile",
      ]),
    );
    expect(
      affected.affectedCapabilityIds,
    ).not.toEqual(
      expect.arrayContaining([
        "domain.combat",
        "domain.chunks",
        "domain.entity-ai",
      ]),
    );
  });

  it("expands parser-core changes conservatively across script-backed domains", () => {
    const graph =
      createTaskGraph(
        BUILTIN_TASK_CAPABILITIES,
      );
    const affected =
      resolveAffectedTasks(
        graph,
        [
          "analyzers/scripts/src/parse.ts",
        ],
      );

    expect(
      affected.directCapabilityIds,
    ).toEqual([
      "source.scripts.core",
    ]);
    expect(
      affected.affectedCapabilityIds,
    ).toEqual(
      expect.arrayContaining([
        "domain.arena-lifecycle",
        "domain.inventory",
        "domain.combat",
        "domain.chunks",
        "domain.economy",
      ]),
    );
  });

  it("keeps runtime-lab changes out of unrelated static domains", () => {
    const graph =
      createTaskGraph(
        BUILTIN_TASK_CAPABILITIES,
      );
    const affected =
      resolveAffectedTasks(
        graph,
        [
          "packages/runtime-lab/src/entity-navigation-experiment.ts",
        ],
      );

    expect(
      affected.directCapabilityIds,
    ).toEqual([
      "runtime.entity-ai",
    ]);
    expect(
      affected.affectedCapabilityIds,
    ).not.toEqual(
      expect.arrayContaining([
        "domain.inventory",
        "domain.combat",
        "domain.chunks",
        "domain.economy",
      ]),
    );
  });
});
