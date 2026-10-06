import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Virtual Clients startup network boundary", () => {
  it("keeps update checks out of the core refresh Promise", () => {
    const source = readFileSync(new URL("../src/App.svelte", import.meta.url), "utf8");
    const refresh = source.slice(source.indexOf("async function refresh"), source.indexOf("async function checkUpdateOnce"));
    expect(refresh).not.toContain("backend.checkUpdate()");
    expect(source).toContain("void checkUpdateOnce()");
  });
});
