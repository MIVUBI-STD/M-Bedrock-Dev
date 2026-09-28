import { describe, expect, it } from "vitest";
import {
  deriveSchedulerGenerationGuardTransformHints,
  parseScriptFile,
  SCRIPT_REPAIR_HINT_ANALYZER_ID,
  SCRIPT_REPAIR_HINT_ANALYZER_REVISION,
  SCRIPT_REPAIR_HINT_PARSER_ID,
  SCRIPT_REPAIR_HINT_PARSER_REVISION,
} from "../src/index.js";

const source = {
  artifactId: "art-script",
  relativePath: "scripts/session.ts",
};

describe("scheduler generation guard repair hints", () => {
  it("derives an exact single-line hint only from an explicit captured generation token", () => {
    const text = [
      'import { system } from "@minecraft/server";',
      "class SessionController {",
      "  generation = 0;",
      "  mutate() {}",
      "  schedule() {",
      "    const capturedGeneration = this.generation;",
      "    system.run(() => this.mutate());",
      "  }",
      "}",
    ].join("\n");

    const hints =
      deriveSchedulerGenerationGuardTransformHints(
        "session-controller",
        text,
        source,
      );

    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatchObject({
      family: "scheduler-generation-guard",
      analyzerId: SCRIPT_REPAIR_HINT_ANALYZER_ID,
      analyzerRevision:
        SCRIPT_REPAIR_HINT_ANALYZER_REVISION,
      parserId: SCRIPT_REPAIR_HINT_PARSER_ID,
      parserRevision:
        SCRIPT_REPAIR_HINT_PARSER_REVISION,
      source: {
        ...source,
        range: expect.objectContaining({
          lineStart: 7,
          lineEnd: 7,
        }),
      },
      expectedText:
        "system.run(() => this.mutate())",
      supportedPredicateIds: [
        "stale-callback-observed",
        "cancelled-callback-mutation-observed",
      ],
      supportedFactorIds: [
        "generation-guard-enabled",
      ],
    });
    expect(hints[0]?.replacementText).toContain(
      "if (capturedGeneration !== this.generation) return;",
    );
    expect(hints[0]?.replacementText).toContain(
      "this.mutate();",
    );
  });

  it("publishes derived hints on the normal parsed-script output", () => {
    const text = [
      'import { system } from "@minecraft/server";',
      "class SessionController {",
      "  generation = 0;",
      "  mutate() {}",
      "  schedule() {",
      "    const capturedGeneration = this.generation;",
      "    system.run(() => this.mutate());",
      "  }",
      "}",
    ].join("\n");

    const parsed = parseScriptFile(
      "session-controller",
      text,
      source,
    );

    expect(parsed.repairTransformHints).toHaveLength(1);
    expect(parsed.repairTransformHints?.[0]).toMatchObject({
      family: "scheduler-generation-guard",
      expectedText:
        "system.run(() => this.mutate())",
    });
  });

  it("supports aliased system imports without changing causal semantics", () => {
    const text = [
      'import { system as scheduler } from "@minecraft/server";',
      "class SessionController {",
      "  generation = 0;",
      "  mutate() {}",
      "  schedule() {",
      "    const capturedGeneration = this.generation;",
      "    scheduler.runTimeout(() => this.mutate(), 2);",
      "  }",
      "}",
    ].join("\n");

    const hints =
      deriveSchedulerGenerationGuardTransformHints(
        "session-controller",
        text,
        source,
      );

    expect(hints).toHaveLength(1);
    expect(hints[0]?.expectedText).toBe(
      "scheduler.runTimeout(() => this.mutate(), 2)",
    );
  });

  it("does not emit a hint when callback already proves a generation guard", () => {
    const text = [
      'import { system } from "@minecraft/server";',
      "class SessionController {",
      "  generation = 0;",
      "  mutate() {}",
      "  schedule() {",
      "    const capturedGeneration = this.generation;",
      "    system.run(() => { if (capturedGeneration !== this.generation) return; this.mutate(); });",
      "  }",
      "}",
    ].join("\n");

    expect(
      deriveSchedulerGenerationGuardTransformHints(
        "session-controller",
        text,
        source,
      ),
    ).toEqual([]);
  });

  it("does not invent a repair when capture is mutable, unrelated, or scheduler call spans multiple lines", () => {
    const mutable = [
      'import { system } from "@minecraft/server";',
      "class SessionController {",
      "  generation = 0;",
      "  mutate() {}",
      "  schedule() {",
      "    let capturedGeneration = this.generation;",
      "    system.run(() => this.mutate());",
      "  }",
      "}",
    ].join("\n");

    const unrelated = [
      'import { system } from "@minecraft/server";',
      "class SessionController {",
      "  state = 0;",
      "  mutate() {}",
      "  schedule() {",
      "    const capturedState = this.state;",
      "    system.run(() => this.mutate());",
      "  }",
      "}",
    ].join("\n");

    const multiline = [
      'import { system } from "@minecraft/server";',
      "class SessionController {",
      "  generation = 0;",
      "  mutate() {}",
      "  schedule() {",
      "    const capturedGeneration = this.generation;",
      "    system.run(",
      "      () => this.mutate()",
      "    );",
      "  }",
      "}",
    ].join("\n");

    expect(
      deriveSchedulerGenerationGuardTransformHints(
        "session-controller",
        mutable,
        source,
      ),
    ).toEqual([]);
    expect(
      deriveSchedulerGenerationGuardTransformHints(
        "session-controller",
        unrelated,
        source,
      ),
    ).toEqual([]);
    expect(
      deriveSchedulerGenerationGuardTransformHints(
        "session-controller",
        multiline,
        source,
      ),
    ).toEqual([]);
  });
});
