export type MockReviewItemState =
  | "outdated-proof"
  | "confirmed-defect"
  | "runtime-test-required"
  | "probable-defect"
  | "designed-behavior"
  | "verified";

export interface MockReviewItem {
  id: string;
  title: string;
  state: MockReviewItemState;
  stateLabel: string;
  proof?: string;
  severity?: "Critical" | "Medium" | "Minor";
  whatHappened: string;
  why: string;
  nextAction?: string;
  technical?: { finding: string; source: string; proofBasis: string };
  section: "attention" | "understood";
}

export const mockMap = {
  name: "Blitz Build",
  version: "v1.0.2",
  target: "Bedrock · 1.26.32",
};

export const mockItems: readonly MockReviewItem[] = [
  {
    id: "outside-plot",
    title: "Player can affect blocks outside the build plot",
    state: "confirmed-defect",
    stateLabel: "Confirmed defect",
    proof: "LIVE GAME VERIFIED",
    severity: "Critical",
    whatHappened: "Water interactions can change blocks outside the active build plot.",
    why: "Runtime evidence contradicts the authored rule that build interactions are limited to the active plot.",
    nextAction: "Review repair",
    technical: {
      finding: "CROSS_SCOPE_STATE_RISK",
      source: "scripts/arena/session.ts",
      proofBasis: "mock-projection-v1",
    },
    section: "attention",
  },
  {
    id: "cleanup-proof",
    title: "Arena cleanup test result is outdated",
    state: "outdated-proof",
    stateLabel: "Test result is outdated",
    proof: "Previous LIVE GAME VERIFIED proof",
    whatHappened: "The map changed after the last cleanup validation was completed.",
    why: "The old result no longer proves the current artifact because its fingerprint changed.",
    nextAction: "Re-run validation",
    section: "attention",
  },
  {
    id: "reconnect",
    title: "Reconnect may keep stale session state",
    state: "runtime-test-required",
    stateLabel: "Runtime test required",
    proof: "STATIC VERIFIED",
    severity: "Medium",
    whatHappened: "Static analysis found a possible session-generation mismatch after reconnect.",
    why: "The behavior depends on multiplayer runtime ordering, so static evidence cannot confirm a defect.",
    nextAction: "Prepare runtime test",
    section: "attention",
  },
  {
    id: "score-return",
    title: "Round-end scoring matches authored behavior",
    state: "designed-behavior",
    stateLabel: "Designed behavior",
    proof: "PACKAGE VERIFIED",
    whatHappened: "Players can receive points even when similarity is below 100% when the round ends.",
    why: "The observed scoring path matches the authored scoring behavior recovered from the map.",
    section: "understood",
  },
];

export const mockHistory = [
  { time: "22:41", title: "Analysis completed", detail: "3 items need attention" },
  { time: "22:22", title: "Validation run", detail: "8 passed · 1 outdated" },
  { time: "21:58", title: "Repair applied", detail: "Arena cleanup ordering" },
] as const;
