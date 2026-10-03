import type {
  AnalysisKnowledgeDomain,
} from "../../analysis-planner/src/index.js";
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
  readonly expectationHints: readonly string[];
  readonly designHints: readonly string[];
  readonly historicalHints: readonly string[];
  readonly scopeHints: readonly string[];
  readonly exclusionHints: readonly string[];
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

  const hasSymptom = input.items.some(
    (item) => item.kind === "SYMPTOM_REPORT",
  );
  if (
    hasSymptom &&
    input.priorityDomains.length === 0 &&
    input.priorityPlayerFlows.length === 0 &&
    input.ambiguities.length === 0
  ) {
    issues.push(
      "User-reported symptoms require at least one bounded priority domain/player-flow interpretation or an explicit ambiguity record.",
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
      expectationHints: [],
      designHints: [],
      historicalHints: [],
      scopeHints: [],
      exclusionHints: [],
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

  const hints = (
    kind: AuditUserInputClass,
  ): string[] =>
    normalized.items
      .filter((item) => item.kind === kind)
      .map((item) => item.normalized);

  return {
    domains,
    playerFlows,
    symptomHints:
      unique(hints("SYMPTOM_REPORT")),
    suspicionHints:
      unique(hints("SUSPICION")),
    expectationHints:
      unique(hints("EXPECTATION_CLAIM")),
    designHints:
      unique(hints("DESIGN_CLAIM")),
    historicalHints:
      unique(hints("HISTORICAL_REFERENCE")),
    scopeHints:
      unique(hints("SCOPE_REQUEST")),
    exclusionHints:
      unique(hints("EXCLUSION_REQUEST")),
    testConstraints:
      unique(hints("TEST_CONSTRAINT")),
  };
}

const KNOWLEDGE_BY_PRIORITY_DOMAIN:
  Readonly<Record<
    GameplayIssueFailureDomain,
    readonly AnalysisKnowledgeDomain[]
  >> = {
    "arena-multi-arena": [
      "arena-lifecycle",
      "multiplayer-interleaving",
      "state-flow",
    ],
    "inventory-economy": [
      "inventory-state",
      "economy-reward",
      "persistence-recovery",
    ],
    "progression-wave-objective": [
      "state-flow",
      "entity-behavior",
      "chunk-simulation",
    ],
    "chunk-simulation": [
      "chunk-simulation",
      "platform-constraints",
    ],
    "player-lifecycle": [
      "state-flow",
      "persistence-recovery",
      "temporal-ownership",
    ],
    "entity-ai-combat": [
      "entity-behavior",
      "combat-lifecycle",
      "chunk-simulation",
    ],
    "world-structure-mutation": [
      "world-structure",
      "spatial-authority",
      "temporal-ownership",
    ],
    "ui-feedback-information": [
      "state-flow",
    ],
    "state-ownership": [
      "state-flow",
      "temporal-ownership",
    ],
    "temporal-async": [
      "temporal-ownership",
      "state-flow",
    ],
    "boundary-capacity": [
      "multiplayer-interleaving",
      "platform-constraints",
      "state-flow",
    ],
    "persistence-recovery": [
      "persistence-recovery",
      "state-flow",
      "temporal-ownership",
    ],
    "platform-performance": [
      "platform-constraints",
      "chunk-simulation",
    ],
  };

export function deriveAuditUserIntentKnowledgeDemand(
  input: AuditUserIntentEnvelope | undefined,
): readonly AnalysisKnowledgeDomain[] {
  if (input === undefined) return [];

  const normalized =
    normalizeAuditUserIntent(input);
  return [
    ...new Set(
      normalized.priorityDomains.flatMap(
        (domain) =>
          KNOWLEDGE_BY_PRIORITY_DOMAIN[domain],
      ),
    ),
  ].sort();
}

export function auditUserIntentAuthorityNote(): string {
  return (
    "User input is hint-only search guidance. " +
    "It may raise investigation priority but cannot establish Expected/Actual behavior, issue type, severity, proof status, safety, or absence."
  );
}
