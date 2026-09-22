export type MutationDomain =
  | "command-selector"
  | "command-coordinate"
  | "command-reference"
  | "state-reset"
  | "state-phase"
  | "state-concurrency";

export interface MutationDescriptor {
  id: string;
  operator: string;
  domain: MutationDomain;
  description: string;
}

export interface SourceMutation {
  descriptor: MutationDescriptor;
  original: string;
  mutated: string;
}

export interface MutationTestResult {
  descriptor: MutationDescriptor;
  status: "killed" | "survived" | "invalid";
  evidence?: string;
}

export interface MutationScoreReport {
  total: number;
  killed: number;
  survived: number;
  invalid: number;
  score: number;
  byDomain: Record<string, {
    total: number;
    killed: number;
    survived: number;
    invalid: number;
    score: number;
  }>;
  results: MutationTestResult[];
}
