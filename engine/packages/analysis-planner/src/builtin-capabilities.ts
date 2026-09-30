import {
  ARENA_ANALYSIS_CAPABILITIES,
} from "./arena-capabilities.js";
import {
  DOMAIN_ANALYSIS_CAPABILITIES,
} from "./domain-capabilities.js";
import type {
  AnalysisCapability,
} from "./types.js";

export const BUILTIN_ANALYSIS_CAPABILITIES:
  readonly AnalysisCapability[] = [
    ...ARENA_ANALYSIS_CAPABILITIES,
    ...DOMAIN_ANALYSIS_CAPABILITIES,
  ];
