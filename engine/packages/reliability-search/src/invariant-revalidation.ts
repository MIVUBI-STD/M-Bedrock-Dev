import type {
  MinecraftUpdateDelta,
  ReliabilityDomain,
} from "../../reliability/src/index.js";
import type { MinedInvariantCandidate } from "./invariant-mining-types.js";

export interface InvariantCapabilityProfile {
  domains: readonly ReliabilityDomain[];
  capabilityTags: readonly string[];
}

export interface InvariantRevalidationTask {
  candidateId: string;
  kind: MinedInvariantCandidate["kind"];
  priority: "P0" | "P1";
  updateVersion: string;
  reasons: string[];
  matchingDeltaEntries: string[];
}

export function invariantCapabilityProfile(
  candidate: MinedInvariantCandidate,
): InvariantCapabilityProfile {
  switch (candidate.kind) {
    case "player-phase-implies-connected":
    case "player-phase-implies-arena":
    case "disconnected-implies-zero-progress":
    case "playing-progress-nondecreasing":
      return { domains: ["multiplayer", "state"], capabilityTags: ["gameplay-state", "multiplayer-concurrency"] };
    case "arena-cutscene-implies-starting-player":
      return { domains: ["multiplayer", "state"], capabilityTags: ["gameplay-state", "multiplayer-concurrency", "cutscene"] };
    case "player-tag-implies-score":
      return { domains: ["state", "commands"], capabilityTags: ["gameplay-state", "command:scoreboard"] };
    case "entity-arena-tag-consistency":
      return { domains: ["entities", "state"], capabilityTags: ["entity-ai", "gameplay-state"] };
    case "entity-within-arena-region":
      return { domains: ["entities", "commands"], capabilityTags: ["entity-ai", "command:teleport", "repeated-topology"] };
  }
}

export function createInvariantRevalidationTasks(
  candidates: readonly MinedInvariantCandidate[],
  delta: MinecraftUpdateDelta,
): InvariantRevalidationTask[] {
  const tasks: InvariantRevalidationTask[] = [];

  for (const candidate of candidates) {
    if (candidate.status === "rejected") continue;
    const profile = invariantCapabilityProfile(candidate);
    const entries = delta.entries.filter((entry) =>
      profile.domains.includes(entry.domain) ||
      entry.capabilityTags.some((tag) => profile.capabilityTags.includes(tag)),
    );
    if (entries.length === 0) continue;

    const severe = entries.some((entry) =>
      entry.kind === "behavior-changed" ||
      entry.kind === "validation-tightened" ||
      entry.kind === "removed"
    );

    tasks.push({
      candidateId: candidate.id,
      kind: candidate.kind,
      priority: severe ? "P0" : "P1",
      updateVersion: delta.toVersion,
      reasons: entries.map((entry) => `${entry.id}: ${entry.summary}`),
      matchingDeltaEntries: entries.map((entry) => entry.id).sort(),
    });
  }

  return tasks.sort((a, b) =>
    (a.priority === "P0" ? 0 : 1) - (b.priority === "P0" ? 0 : 1) ||
    b.matchingDeltaEntries.length - a.matchingDeltaEntries.length ||
    a.candidateId.localeCompare(b.candidateId),
  );
}
