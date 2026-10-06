import {
  describe,
  expect,
  it,
} from "vitest";
import {
  parseScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import {
  analyzeInteractionLifecycle,
} from "../../src/inspection/interaction-lifecycle-analysis.js";

function source(text: string) {
  return [{
    parsed: parseScriptFile(
      "main",
      text,
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    ),
    text,
  }];
}

describe("interaction lifecycle analysis", () => {
  it("requires cancel and current-state revalidation after form completion", () => {
    const text = [
      "async function buy(player, form, formGeneration) {",
      "  const response = await form.show(player);",
      "  if (response.canceled || response.selection === undefined) return;",
      "  if (!isCurrentFormGeneration(player, formGeneration)) return;",
      "  purchase(player, response.selection);",
      "}",
    ].join("\n");

    const result =
      analyzeInteractionLifecycle(
        source(text),
      );

    expect(result.formShowPaths).toBe(1);
    expect(
      result.formCancelGuardPaths,
    ).toBeGreaterThan(0);
    expect(
      result.formResponseRevalidationPaths,
    ).toBeGreaterThan(0);
    expect(
      result.staleFormResponseGaps,
    ).toBe(0);
  });

  it("keeps a form response with direct default action unresolved", () => {
    const text = [
      "async function buy(player, form) {",
      "  const response = await form.show(player);",
      "  purchase(player, response.selection ?? 0);",
      "}",
    ].join("\n");

    expect(
      analyzeInteractionLifecycle(
        source(text),
      ).staleFormResponseGaps,
    ).toBe(1);
  });

  it("requires first-event or debounce evidence for held interaction subscriptions", () => {
    const unsafe = [
      "world.beforeEvents.playerInteractWithBlock.subscribe((event) => {",
      "  purchase(event.player);",
      "});",
    ].join("\n");
    const safe = [
      "world.beforeEvents.playerInteractWithBlock.subscribe((event) => {",
      "  if (!event.isFirstEvent) return;",
      "  purchase(event.player);",
      "});",
    ].join("\n");

    expect(
      analyzeInteractionLifecycle(
        source(unsafe),
      ).repeatedInputRisks,
    ).toBe(1);
    expect(
      analyzeInteractionLifecycle(
        source(safe),
      ).repeatedInputRisks,
    ).toBe(0);
  });

  it("distinguishes direct input disable from owner-set lease evidence", () => {
    const unsafe =
      "player.inputPermissions.movementEnabled = false;";
    const safe = [
      "inputLockOwners.add(ownerId);",
      "player.inputPermissions.movementEnabled = false;",
      "world.afterEvents.playerSpawn.subscribe(() => {",
      "  inputLockOwners.delete(ownerId);",
      "  player.inputPermissions.movementEnabled = true;",
      "});",
    ].join("\n");

    expect(
      analyzeInteractionLifecycle(
        source(unsafe),
      ).directInputLockRisks,
    ).toBe(1);
    const result =
      analyzeInteractionLifecycle(
        source(safe),
      );
    expect(
      result.inputOwnerSetEvidence,
    ).toBeGreaterThan(0);
    expect(
      result.inputLifecycleRestoreEvidence,
    ).toBeGreaterThan(0);
    expect(
      result.directInputLockRisks,
    ).toBe(0);
  });
});
