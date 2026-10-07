import type { SourceRef } from "../../../packages/project-model/src/index.js";

export interface ParsedBlockDefinition {
  identifier?: string;
  formatVersion?: string;
  source: SourceRef;
  components: Record<string, unknown>;
}

export interface BlockTickSchedule {
  component: "minecraft:tick" | "minecraft:queued_ticking";
  intervalRange?: readonly [number, number];
  looping?: boolean;
  deprecated: boolean;
  timingStatus: "explicit" | "partial";
  source: SourceRef;
}
