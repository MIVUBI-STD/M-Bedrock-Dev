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

describe("Restore recovery point confirmation", () => {
  it("discloses discarded changes and isolates the selected client", () => {
    const source = readFileSync(
      new URL("../src/app/components/RestoreRecoveryPointDialog.svelte", import.meta.url),
      "utf8",
    );
    expect(source).toMatch(/discards changes made after/i);
    expect(source).toMatch(/local world changes/i);
    expect(source).toMatch(/Other clients are not changed/);
    expect(source).toMatch(/on:click=\{onCancel\}/);
    expect(source).toMatch(/on:click=\{onConfirm\}/);
  });

  it("routes the restore request through the confirmation dialog", () => {
    const source = readFileSync(new URL("../src/App.svelte", import.meta.url), "utf8");
    expect(source).toContain("onReset={(client) => { confirmReset = client; }}");
    expect(source).toContain("onConfirm={resetConfirmed}");
    expect(source).toContain('if (!client || client === "Native" || busy || loading) return;');
  });
});
