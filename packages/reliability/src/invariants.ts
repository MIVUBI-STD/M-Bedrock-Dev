import type { ReliabilityInvariant } from "./types.js";

export class InvariantRegistry {
  private readonly entries = new Map<string, ReliabilityInvariant>();

  constructor(initial: readonly ReliabilityInvariant[] = []) {
    for (const invariant of initial) this.register(invariant);
  }

  register(invariant: ReliabilityInvariant): void {
    const existing = this.entries.get(invariant.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(invariant)) {
      throw new Error(`Invariant id already registered with different semantics: ${invariant.id}`);
    }
    this.entries.set(invariant.id, invariant);
  }

  get(id: string): ReliabilityInvariant | undefined {
    return this.entries.get(id);
  }

  all(): ReliabilityInvariant[] {
    return [...this.entries.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  byTag(tag: string): ReliabilityInvariant[] {
    return this.all().filter((entry) => entry.tags.includes(tag));
  }
}

export const BUILT_IN_INVARIANTS: readonly ReliabilityInvariant[] = [
  {
    id: "source.immutable",
    title: "Original artifact remains immutable",
    description: "Inspection and repair must never mutate the original artifact/source tree.",
    domain: "artifact",
    severity: "critical",
    lanes: ["static", "package"],
    tags: ["source", "mutation", "safety"],
    source: "built-in",
  },
  {
    id: "structure.indices-match-volume",
    title: "Structure block index layers match declared volume",
    description: "Every supported mcstructure block-index layer must contain one index per declared block position.",
    domain: "structures",
    severity: "medium",
    lanes: ["static"],
    tags: ["mcstructure", "palette", "indices"],
    source: "built-in",
  },
  {
    id: "multiplayer.state-isolation",
    title: "Independent sessions do not share mutable gameplay state",
    description: "Gameplay sessions intended to be independent must not leak scoreboard/tag/session state into each other.",
    domain: "multiplayer",
    severity: "critical",
    lanes: ["static", "generative", "runtime"],
    tags: ["multiplayer", "scoreboard", "tag", "session"],
    source: "built-in",
  },
  {
    id: "topology.repeated-layout-consistency",
    title: "Repeated gameplay regions preserve expected spatial transforms",
    description: "Repeated spatial gameplay patterns must preserve their established local geometry and translation relation.",
    domain: "commands",
    severity: "medium",
    lanes: ["static", "differential"],
    tags: ["topology", "coordinates", "arena"],
    source: "built-in",
  },
];
