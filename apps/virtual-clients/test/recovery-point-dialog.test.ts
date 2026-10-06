import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Recovery point UX boundary", () => {
  it("requires explicit signed-in confirmation in presentation", () => {
    const source = readFileSync(
      new URL("../src/app/components/SaveRecoveryPointDialog.svelte", import.meta.url),
      "utf8",
    );
    expect(source).toMatch(/signed in/i);
    expect(source).toMatch(/main menu/i);
    expect(source).toMatch(/does not read or store account credentials/i);
  });
});
