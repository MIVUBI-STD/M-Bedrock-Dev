import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  RegressionCase,
} from "../src/index.js";
import {
  loadRegressionCatalog,
  writeRegressionCatalog,
} from "../src/index.js";

const regression: RegressionCase = {
  id: "regression:reconnect",
  title: "Reconnect keeps membership",
  domain: "multiplayer",
  discoveredBy: "runtime",
  invariantIds: ["membership"],
  triggerTags: ["reconnect"],
  capabilityTags: ["multiplayer-session"],
  reproduction: [
    "1. Join arena.",
    "2. Reconnect player.",
  ],
  expected:
    "Player keeps arena membership.",
  observed:
    "Player became active without membership.",
};

describe("regression catalog writer", () => {
  it("atomically appends a new regression in deterministic id order", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-regression-"),
    );

    try {
      await writeFile(
        join(root, "regressions.json"),
        JSON.stringify({
          schemaVersion: 1,
          regressions: [{
            ...regression,
            id: "regression:z",
          }],
        }),
        "utf8",
      );

      const result =
        await writeRegressionCatalog(
          root,
          regression,
        );

      expect(result.regressionIds).toEqual([
        "regression:reconnect",
        "regression:z",
      ]);

      const loaded =
        await loadRegressionCatalog(root);
      expect(loaded.map((item) => item.id))
        .toEqual(result.regressionIds);

      const text = await readFile(
        join(root, "regressions.json"),
        "utf8",
      );
      expect(text.endsWith("\n")).toBe(true);
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it("is idempotent for identical regression semantics", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-regression-"),
    );

    try {
      await writeFile(
        join(root, "regressions.json"),
        JSON.stringify({
          schemaVersion: 1,
          regressions: [regression],
        }),
        "utf8",
      );

      const result =
        await writeRegressionCatalog(
          root,
          regression,
        );

      expect(result.regressionCount).toBe(1);
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it("rejects an existing regression id with changed semantics", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-regression-"),
    );

    try {
      await writeFile(
        join(root, "regressions.json"),
        JSON.stringify({
          schemaVersion: 1,
          regressions: [regression],
        }),
        "utf8",
      );

      await expect(
        writeRegressionCatalog(
          root,
          {
            ...regression,
            title: "Changed semantics",
          },
        ),
      ).rejects.toThrow(
        /different semantics/,
      );
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
