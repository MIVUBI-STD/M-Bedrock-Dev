import { describe, expect, it } from "vitest";
import {
  mkdtemp,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { inspectArenaGoldenCorpusStatus } from "../../src/arena/arena-golden-status.js";

describe("arena golden corpus status", () => {
  it("preflights approvals and artifact paths without inspecting worlds", async () => {
    const root =
      await mkdtemp(
        join(
          tmpdir(),
          "arena-corpus-status-",
        ),
      );
    await writeFile(
      join(root, "a.mcworld"),
      "fixture",
    );

    const result =
      await inspectArenaGoldenCorpusStatus(
        {
          schemaVersion: 1,
          id: "production",
          requireApproval: true,
          cases: [{
            id: "a",
            label: "A",
            artifactFile:
              "a.mcworld",
            assertions: {},
          }, {
            id: "b",
            label: "B",
            artifactFile:
              "missing.mcworld",
            assertions: {},
            approval: {
              status: "approved",
              approvedBy: "qa",
              approvedAt:
                "2026-09-30T00:00:00Z",
            },
          }],
        },
        root,
      );

    expect(
      result.cases[0]?.readiness,
    ).toBe("unapproved");
    expect(
      result.cases[1]?.readiness,
    ).toBe("missing-artifact");
    expect(result.ready).toBe(0);
    expect(result.blocked).toBe(2);
  });
});
