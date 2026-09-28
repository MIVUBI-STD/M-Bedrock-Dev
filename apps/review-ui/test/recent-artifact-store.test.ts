import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  RecentArtifactStore,
} from "../src/recent-artifact-store.js";

describe("recent artifact store", () => {
  it("persists only managed copies and reopens them by id", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "recent-store-test-"),
    );
    const source = join(root, "source.mcworld");
    const storeRoot = join(root, "store");
    await writeFile(source, "demo");

    try {
      const store = new RecentArtifactStore(
        storeRoot,
        3,
      );
      await store.persist(source, {
        id: "artifact:one",
        label: "Blitz Build.mcworld",
        targetLabel: "Bedrock · 1.26.32",
        attentionCount: 2,
      });

      const list = await store.list();
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({
        id: "artifact:one",
        available: true,
      });

      const resolved =
        await store.resolveArtifact("artifact:one");
      expect(
        await readFile(
          resolved.artifactPath,
          "utf8",
        ),
      ).toBe("demo");
      expect(resolved.record.label).toBe(
        "Blitz Build.mcworld",
      );
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it("removes unavailable entries from future listings", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "recent-store-test-"),
    );
    const source = join(root, "source.mcworld");
    const storeRoot = join(root, "store");
    await writeFile(source, "demo");

    try {
      const store = new RecentArtifactStore(
        storeRoot,
        3,
      );
      const record = await store.persist(source, {
        id: "artifact:gone",
        label: "Gone.mcworld",
        targetLabel: "Bedrock",
        attentionCount: 0,
      });
      const resolved = await store.resolveArtifact(
        record.id,
      );
      await rm(resolved.artifactPath, {
        force: true,
      });

      const list = await store.list();
      expect(list[0]).toMatchObject({
        id: "artifact:gone",
        available: false,
      });
      await expect(
        store.resolveArtifact("artifact:gone"),
      ).rejects.toThrow(/no longer available/i);
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
