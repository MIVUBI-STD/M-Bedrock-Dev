import {
  mkdtemp,
  rm,
} from "node:fs/promises";
import {
  join,
} from "node:path";
import {
  tmpdir,
} from "node:os";
import {
  describe,
  expect,
  it,
} from "vitest";
import {
  createWorkSessionCheckpoint,
  projectWorkspaceLayout,
} from "../../project-model/src/index.js";
import {
  loadSemanticProofClaimStore,
  loadWorkSessionCheckpoint,
  saveWorkSessionCheckpoint,
  upsertSemanticProofClaim,
} from "../src/index.js";

describe("durable zero-waste state stores", () => {
  it("roundtrips a work session checkpoint atomically", async () => {
    const root =
      await mkdtemp(
        join(
          tmpdir(),
          "m-bedrock-session-",
        ),
      );

    try {
      const workspace =
        projectWorkspaceLayout(
          root,
          "project",
        );
      const checkpoint =
        createWorkSessionCheckpoint({
          sessionId: "s1",
          goal: "diagnose",
          artifact: {
            artifactId: "a",
            artifactFingerprint:
              "fp",
          },
        });

      await saveWorkSessionCheckpoint(
        workspace,
        checkpoint,
      );

      expect(
        await loadWorkSessionCheckpoint(
          workspace,
        ),
      ).toEqual(checkpoint);
    } finally {
      await rm(
        root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  });

  it("upserts semantic proof claims without duplicating ids", async () => {
    const root =
      await mkdtemp(
        join(
          tmpdir(),
          "m-bedrock-proof-",
        ),
      );

    try {
      const workspace =
        projectWorkspaceLayout(
          root,
          "project",
        );

      await upsertSemanticProofClaim(
        workspace,
        {
          schemaVersion: 1,
          claimId: "claim:1",
          claimRevision: "1",
          kind: "static",
          basisNodeIds: [
            "node:1",
          ],
          basisFingerprint:
            "basis-a",
          evidenceIds: [
            "e:1",
          ],
        },
      );

      await upsertSemanticProofClaim(
        workspace,
        {
          schemaVersion: 1,
          claimId: "claim:1",
          claimRevision: "2",
          kind: "static",
          basisNodeIds: [
            "node:1",
          ],
          basisFingerprint:
            "basis-b",
          evidenceIds: [
            "e:2",
          ],
        },
      );

      const store =
        await loadSemanticProofClaimStore(
          workspace,
        );

      expect(store.claims)
        .toHaveLength(1);
      expect(
        store.claims[0]
          ?.claimRevision,
      ).toBe("2");
    } finally {
      await rm(
        root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  });
});
