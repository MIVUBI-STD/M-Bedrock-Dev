import {
  describe,
  expect,
  it,
} from "vitest";
import {
  parseScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import {
  analyzeCommandContext,
  commandContextDiagnostics,
} from "../../src/inspection/command-context-analysis.js";

function script(text: string) {
  return parseScriptFile(
    "main",
    text,
    {
      artifactId: "fixture",
      relativePath:
        "scripts/main.ts",
    },
  );
}

describe("command context analysis", () => {
  it("surfaces bare global and tag-only mutation selectors in multi-arena context", () => {
    const result =
      analyzeCommandContext([
        script([
          "dimension.runCommand('tp @a 1 2 3');",
          "dimension.runCommand('tag @a[tag=arena1] add ready');",
        ].join("\n")),
      ], true);

    expect(
      result.bareGlobalMutationCandidates,
    ).toBe(1);
    expect(
      result.tagOnlyMembershipCandidates,
    ).toBe(1);

    expect(
      commandContextDiagnostics(
        result,
      ).map((item) =>
        item.code
      ),
    ).toEqual(
      expect.arrayContaining([
        "COMMAND_SELECTOR_GLOBAL_SCOPE",
        "COMMAND_SELECTOR_STALE_TAG_SCOPE",
      ]),
    );
  });

  it("proves explicit nested execute context for local coordinates", () => {
    const result =
      analyzeCommandContext([
        script(
          "dimension.runCommand('execute at @s positioned 1 2 3 rotated 90 0 anchored eyes run tp @s ^1 ^ ^2');",
        ),
      ], false);

    expect(
      result.tracedExecuteCommands,
    ).toBe(1);
    expect(
      result.relativeContextUnresolved,
    ).toBe(0);
    expect(
      result.assessments[0]
        ?.relativeContext,
    ).toBe("proven");
  });

  it("keeps relative coordinates unresolved without explicit context trace", () => {
    const result =
      analyzeCommandContext([
        script(
          "dimension.runCommand('tp @s ~1 ~ ~2');",
        ),
      ], false);

    expect(
      result.relativeContextUnresolved,
    ).toBe(1);
  });
});
