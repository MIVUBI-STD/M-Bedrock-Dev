import {
  mkdtemp,
  rm,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  ReviewHistoryStore,
} from "../src/review-history-store.js";

describe("review history store", () => {
  it("records and lists analysis events per artifact", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "review-history-test-"),
    );

    try {
      const store = new ReviewHistoryStore(
        root,
        5,
        20,
      );
      await store.recordAnalysis({
        artifactId: "art:one",
        trigger: "file-open",
        attentionCount: 3,
        targetLabel: "Bedrock · 1.26.32",
      });
      await store.recordAnalysis({
        artifactId: "art:two",
        trigger: "recent-open",
        attentionCount: 1,
        targetLabel: "Bedrock",
      });

      const one = await store.list("art:one");
      expect(one).toHaveLength(1);
      expect(one[0]).toMatchObject({
        artifactId: "art:one",
        kind: "analysis-completed",
        trigger: "file-open",
        attentionCount: 3,
      });
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it("bounds retained history per artifact", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "review-history-test-"),
    );

    try {
      const store = new ReviewHistoryStore(
        root,
        2,
        20,
      );
      for (let index = 0; index < 3; index += 1) {
        await store.recordAnalysis({
          artifactId: "art:one",
          trigger: "reanalysis",
          attentionCount: index,
          targetLabel: "Bedrock",
        });
      }

      expect(
        await store.list("art:one"),
      ).toHaveLength(2);
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
