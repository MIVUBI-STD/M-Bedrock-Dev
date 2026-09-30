import type { RegressionCase } from "./types.js";

export class RegressionCorpus {
  private readonly entries = new Map<string, RegressionCase>();

  constructor(initial: readonly RegressionCase[] = []) {
    for (const regression of initial) this.add(regression);
  }

  add(regression: RegressionCase): void {
    const existing = this.entries.get(regression.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(regression)) {
      throw new Error(`Regression id already exists with different semantics: ${regression.id}`);
    }
    this.entries.set(regression.id, regression);
  }

  all(): RegressionCase[] {
    return [...this.entries.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  matchingCapabilities(capabilityTags: readonly string[]): RegressionCase[] {
    const capabilities = new Set(capabilityTags);
    return this.all().filter((entry) =>
      entry.capabilityTags.some((tag) => capabilities.has(tag)),
    );
  }

  matchingTriggers(triggerTags: readonly string[]): RegressionCase[] {
    const triggers = new Set(triggerTags);
    return this.all().filter((entry) =>
      entry.triggerTags.some((tag) => triggers.has(tag)),
    );
  }
}
