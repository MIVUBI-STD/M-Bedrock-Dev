import type { FailurePattern } from "../core/types.js";

export class FailurePatternCatalog {
  private readonly entries = new Map<string, FailurePattern>();

  constructor(initial: readonly FailurePattern[] = []) {
    for (const pattern of initial) this.add(pattern);
  }

  add(pattern: FailurePattern): void {
    const existing = this.entries.get(pattern.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(pattern)) {
      throw new Error("Failure pattern id already exists with different semantics: " + pattern.id);
    }
    this.entries.set(pattern.id, pattern);
  }

  all(): FailurePattern[] {
    return [...this.entries.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  supportingRegression(regressionId: string): FailurePattern[] {
    return this.all().filter((pattern) => pattern.supportingRegressionIds.includes(regressionId));
  }

  matchingCapabilities(capabilityTags: readonly string[]): FailurePattern[] {
    const values = new Set(capabilityTags);
    return this.all().filter((pattern) => pattern.capabilityTags.some((tag) => values.has(tag)));
  }

  matchingTriggers(triggerTags: readonly string[]): FailurePattern[] {
    const values = new Set(triggerTags);
    return this.all().filter((pattern) => pattern.triggerTags.some((tag) => values.has(tag)));
  }
}
