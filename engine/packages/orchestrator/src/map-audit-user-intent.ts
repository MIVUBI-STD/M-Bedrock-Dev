import {
  GAMEPLAY_ISSUE_FAILURE_DOMAINS,
  type GameplayIssueFailureDomain,
  type GameplayIssueFlowStage,
} from "../../diagnostic-reasoning/src/index.js";

export type AuditUserInputClass =
  | "TARGET_HINT"
  | "SYMPTOM_REPORT"
  | "SUSPICION"
  | "EXPECTATION_CLAIM"
  | "DESIGN_CLAIM"
  | "TEST_CONSTRAINT"
  | "SCOPE_REQUEST"
  | "OUTPUT_REQUEST"
  | "HISTORICAL_REFERENCE"
  | "EXCLUSION_REQUEST";

const USER_INPUT_CLASSES = new Set<AuditUserInputClass>([
  "TARGET_HINT",
  "SYMPTOM_REPORT",
  "SUSPICION",
  "EXPECTATION_CLAIM",
  "DESIGN_CLAIM",
  "TEST_CONSTRAINT",
  "SCOPE_REQUEST",
  "OUTPUT_REQUEST",
  "HISTORICAL_REFERENCE",
  "EXCLUSION_REQUEST",
]);

const PLAYER_FLOWS = new Set<GameplayIssueFlowStage>([
  "ENTRY_JOIN",
  "READY_START",
  "SETUP",
  "ACTIVE_GAMEPLAY",
  "PROGRESSION",
  "TERMINAL",
  "CLEANUP_REPLAY",
  "RECOVERY",
]);

const FAILURE_DOMAINS =
  new Set<GameplayIssueFailureDomain>(
    GAMEPLAY_ISSUE_FAILURE_DOMAINS,
  );

export interface AuditUserIntentItem {
  readonly kind: AuditUserInputClass;
  readonly raw: string;
  readonly normalized: string;
}

export interface AuditUserIntentEnvelope {
  readonly schemaVersion: 1;
  readonly policy: "user-input-is-search-guidance-not-gameplay-authority";
  readonly items: readonly AuditUserIntentItem[];
  readonly priorityDomains: readonly GameplayIssueFailureDomain[];
  readonly priorityPlayerFlows: readonly GameplayIssueFlowStage[];
  readonly ambiguities: readonly string[];
}

export interface AuditUserIntentSearchPressure {
  readonly domains: Readonly<
    Partial<Record<GameplayIssueFailureDomain, number>>
  >;
  readonly playerFlows: Readonly<
    Partial<Record<GameplayIssueFlowStage, number>>
  >;
  readonly symptomHints: readonly string[];
  readonly suspicionHints: readonly string[];
  readonly testConstraints: readonly string[];
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function unique(values: readonly string[]): string[] {
  return [...new Set(
    values.map(clean).filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));
}

export function normalizeAuditUserIntent(
  input: AuditUserIntentEnvelope,
): AuditUserIntentEnvelope {
  const seen = new Set<string>();
  const items = input.items.flatMap((item) => {
    const raw = clean(item.raw);
    const normalized = clean(item.normalized);
    if (!raw || !normalized) return [];
    const key =
      item.kind + "|" +
      raw.toLowerCase() + "|" +
      normalized.toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      kind: item.kind,
      raw,
      normalized,
    }];
  });

  return {
    schemaVersion: 1,
    policy:
      "user-input-is-search-guidance-not-gameplay-authority",
    items,
    priorityDomains:
      [...new Set(input.priorityDomains)].sort(),
    priorityPlayerFlows:
      [...new Set(input.priorityPlayerFlows)].sort(),
    ambiguities: unique(input.ambiguities),
  };
}

export function validateAuditUserIntent(
  input: AuditUserIntentEnvelope,
): readonly string[] {
  const issues: string[] = [];

  if (input.schemaVersion !== 1) {
    issues.push(
      "User audit intent schemaVersion must be 1.",
    );
  }
  if (
    input.policy !==
    "user-input-is-search-guidance-not-gameplay-authority"
  ) {
    issues.push(
      "User audit intent must use the non-authoritative search-guidance policy.",
    );
  }

  for (const [index, item] of input.items.entries()) {
    if (!USER_INPUT_CLASSES.has(item.kind)) {
      issues.push(
        "User audit intent item " +
        index +
        " has unsupported kind: " +
        String(item.kind) +
        ".",
      );
    }
    if (!clean(item.raw)) {
      issues.push(
        "User audit intent item " +
        index +
        " has empty raw text.",
      );
    }
    if (!clean(item.normalized)) {
      issues.push(
        "User audit intent item " +
        index +
        " has empty normalized text.",
      );
    }
  }

  for (const domain of input.priorityDomains) {
    if (!FAILURE_DOMAINS.has(domain)) {
      issues.push(
        "User audit intent has unsupported priority domain: " +
        String(domain) +
        ".",
      );
    }
  }

  for (const flow of input.priorityPlayerFlows) {
    if (!PLAYER_FLOWS.has(flow)) {
      issues.push(
        "User audit intent has unsupported priority player flow: " +
        String(flow) +
        ".",
      );
    }
  }

  if (
    input.ambiguities.some(
      (item) => !clean(item),
    )
  ) {
    issues.push(
      "User audit intent ambiguities must contain only non-empty text.",
    );
  }

  return issues;
}

function bump<T extends string>(
  target: Partial<Record<T, number>>,
  key: T,
  amount: number,
): void {
  target[key] = (target[key] ?? 0) + amount;
}

export function deriveAuditUserIntentSearchPressure(
  input: AuditUserIntentEnvelope | undefined,
): AuditUserIntentSearchPressure {
  if (input === undefined) {
    return {
      domains: {},
      playerFlows: {},
      symptomHints: [],
      suspicionHints: [],
      testConstraints: [],
    };
  }

  const normalized =
    normalizeAuditUserIntent(input);
  const domains:
    Partial<Record<GameplayIssueFailureDomain, number>> = {};
  const playerFlows:
    Partial<Record<GameplayIssueFlowStage, number>> = {};

  for (const domain of normalized.priorityDomains) {
    bump(domains, domain, 2);
  }
  for (const flow of normalized.priorityPlayerFlows) {
    bump(playerFlows, flow, 2);
  }

  const symptomHints = normalized.items
    .filter((item) => item.kind === "SYMPTOM_REPORT")
    .map((item) => item.normalized);
  const suspicionHints = normalized.items
    .filter((item) => item.kind === "SUSPICION")
    .map((item) => item.normalized);
  const testConstraints = normalized.items
    .filter((item) => item.kind === "TEST_CONSTRAINT")
    .map((item) => item.normalized);

  return {
    domains,
    playerFlows,
    symptomHints: unique(symptomHints),
    suspicionHints: unique(suspicionHints),
    testConstraints: unique(testConstraints),
  };
}

export function auditUserIntentAuthorityNote(): string {
  return (
    "User input is hint-only search guidance. " +
    "It may raise investigation priority but cannot establish Expected/Actual behavior, issue type, severity, proof status, safety, or absence."
  );
}
