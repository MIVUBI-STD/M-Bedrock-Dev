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

export interface AuditUserInputFragment {
  readonly id: string;
  readonly raw: string;
}

export interface AuditUserIntentItem {
  readonly kind: AuditUserInputClass;
  readonly raw: string;
  readonly normalized: string;
  readonly sourceFragmentIds: readonly string[];
}

export interface AuditUserIntentEnvelope {
  readonly schemaVersion: 1;
  readonly policy: "user-input-is-search-guidance-not-gameplay-authority";
  readonly fragments: readonly AuditUserInputFragment[];
  readonly items: readonly AuditUserIntentItem[];
  readonly unmappedFragmentIds: readonly string[];
  readonly priorityDomains: readonly GameplayIssueFailureDomain[];
  readonly priorityPlayerFlows: readonly GameplayIssueFlowStage[];
  readonly ambiguities: readonly string[];
  readonly blockingAmbiguities: readonly string[];
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

function unique(
  values: readonly string[] | undefined,
): string[] {
  return [...new Set(
    (values ?? []).map(clean).filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));
}

export function normalizeAuditUserIntent(
  input: AuditUserIntentEnvelope,
): AuditUserIntentEnvelope {
  const fragments = (
    Array.isArray(input.fragments)
      ? input.fragments
      : []
  ).flatMap((fragment) => {
    if (
      fragment === null ||
      typeof fragment !== "object" ||
      typeof fragment.id !== "string" ||
      typeof fragment.raw !== "string"
    ) {
      return [];
    }
    const id = clean(fragment.id);
    const raw = clean(fragment.raw);
    return id && raw
      ? [{ id, raw }]
      : [];
  });
  const fragmentIds = new Set(
    fragments.map((fragment) => fragment.id),
  );

  const seen = new Set<string>();
  const items = (
    Array.isArray(input.items)
      ? input.items
      : []
  ).flatMap((item) => {
    if (
      item === null ||
      typeof item !== "object" ||
      !USER_INPUT_CLASSES.has(item.kind) ||
      typeof item.raw !== "string" ||
      typeof item.normalized !== "string"
    ) {
      return [];
    }
    const raw = clean(item.raw);
    const normalized = clean(item.normalized);
    if (!raw || !normalized) return [];
    const key =
      item.kind + "|" +
      normalized.toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      kind: item.kind,
      raw,
      normalized,
      sourceFragmentIds:
        [...new Set(
          (
            Array.isArray(item.sourceFragmentIds)
              ? item.sourceFragmentIds
              : []
          )
            .map(clean)
            .filter((id) => fragmentIds.has(id)),
        )].sort(),
    }];
  });

  const priorityDomains =
    Array.isArray(input.priorityDomains)
      ? input.priorityDomains.filter(
          (domain): domain is GameplayIssueFailureDomain =>
            FAILURE_DOMAINS.has(domain),
        )
      : [];
  const priorityPlayerFlows =
    Array.isArray(input.priorityPlayerFlows)
      ? input.priorityPlayerFlows.filter(
          (flow): flow is GameplayIssueFlowStage =>
            PLAYER_FLOWS.has(flow),
        )
      : [];

  return {
    schemaVersion: 1,
    policy:
      "user-input-is-search-guidance-not-gameplay-authority",
    fragments,
    items,
    unmappedFragmentIds:
      [...new Set(
        (
          Array.isArray(input.unmappedFragmentIds)
            ? input.unmappedFragmentIds
            : []
        )
          .map(clean)
          .filter((id) => fragmentIds.has(id)),
      )].sort(),
    priorityDomains:
      [...new Set(priorityDomains)].sort(),
    priorityPlayerFlows:
      [...new Set(priorityPlayerFlows)].sort(),
    ambiguities:
      unique(
        Array.isArray(input.ambiguities)
          ? input.ambiguities
          : [],
      ),
    blockingAmbiguities:
      unique(
        Array.isArray(input.blockingAmbiguities)
          ? input.blockingAmbiguities
          : [],
      ),
  };
}

export function validateAuditUserIntent(
  input: AuditUserIntentEnvelope,
): readonly string[] {
  const issues: string[] = [];

  if (
    input === null ||
    typeof input !== "object"
  ) {
    return [
      "User audit intent must be an object.",
    ];
  }

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

  if (!Array.isArray(input.fragments)) {
    issues.push(
      "User audit intent fragments must be an array.",
    );
  }
  if (!Array.isArray(input.items)) {
    issues.push(
      "User audit intent items must be an array.",
    );
  }
  if (!Array.isArray(input.unmappedFragmentIds)) {
    issues.push(
      "User audit intent unmappedFragmentIds must be an array.",
    );
  }
  if (!Array.isArray(input.priorityDomains)) {
    issues.push(
      "User audit intent priorityDomains must be an array.",
    );
  }
  if (!Array.isArray(input.priorityPlayerFlows)) {
    issues.push(
      "User audit intent priorityPlayerFlows must be an array.",
    );
  }
  if (!Array.isArray(input.ambiguities)) {
    issues.push(
      "User audit intent ambiguities must be an array.",
    );
  }
  if (!Array.isArray(input.blockingAmbiguities)) {
    issues.push(
      "User audit intent blockingAmbiguities must be an array.",
    );
  }

  const fragments =
    Array.isArray(input.fragments)
      ? input.fragments
      : [];
  const fragmentIds = new Set<string>();
  for (const [index, fragment] of fragments.entries()) {
    if (
      fragment === null ||
      typeof fragment !== "object"
    ) {
      issues.push(
        "User audit intent fragment " +
        index +
        " must be an object.",
      );
      continue;
    }
    if (
      typeof fragment.id !== "string" ||
      !clean(fragment.id)
    ) {
      issues.push(
        "User audit intent fragment " +
        index +
        " has empty/invalid id.",
      );
    } else if (fragmentIds.has(clean(fragment.id))) {
      issues.push(
        "User audit intent contains duplicate fragment id: " +
        clean(fragment.id) +
        ".",
      );
    } else {
      fragmentIds.add(clean(fragment.id));
    }
    if (
      typeof fragment.raw !== "string" ||
      !clean(fragment.raw)
    ) {
      issues.push(
        "User audit intent fragment " +
        index +
        " has empty/invalid raw text.",
      );
    }
  }

  const items =
    Array.isArray(input.items)
      ? input.items
      : [];
  for (const [index, item] of items.entries()) {
    if (
      item === null ||
      typeof item !== "object"
    ) {
      issues.push(
        "User audit intent item " +
        index +
        " must be an object.",
      );
      continue;
    }
    if (!USER_INPUT_CLASSES.has(item.kind)) {
      issues.push(
        "User audit intent item " +
        index +
        " has unsupported kind: " +
        String(item.kind) +
        ".",
      );
    }
    if (
      typeof item.raw !== "string" ||
      !clean(item.raw)
    ) {
      issues.push(
        "User audit intent item " +
        index +
        " has empty/invalid raw text.",
      );
    }
    if (
      typeof item.normalized !== "string" ||
      !clean(item.normalized)
    ) {
      issues.push(
        "User audit intent item " +
        index +
        " has empty/invalid normalized text.",
      );
    }
    if (!Array.isArray(item.sourceFragmentIds)) {
      issues.push(
        "User audit intent item " +
        index +
        " sourceFragmentIds must be an array.",
      );
    } else {
      for (const id of item.sourceFragmentIds) {
        if (
          typeof id !== "string" ||
          !fragmentIds.has(clean(id))
        ) {
          issues.push(
            "User audit intent item " +
            index +
            " references unknown fragment id: " +
            String(id) +
            ".",
          );
        }
      }
    }
  }

  const priorityDomains =
    Array.isArray(input.priorityDomains)
      ? input.priorityDomains
      : [];
  for (const domain of priorityDomains) {
    if (!FAILURE_DOMAINS.has(domain)) {
      issues.push(
        "User audit intent has unsupported priority domain: " +
        String(domain) +
        ".",
      );
    }
  }

  const priorityPlayerFlows =
    Array.isArray(input.priorityPlayerFlows)
      ? input.priorityPlayerFlows
      : [];
  for (const flow of priorityPlayerFlows) {
    if (!PLAYER_FLOWS.has(flow)) {
      issues.push(
        "User audit intent has unsupported priority player flow: " +
        String(flow) +
        ".",
      );
    }
  }

  const ambiguities =
    Array.isArray(input.ambiguities)
      ? input.ambiguities
      : [];
  if (
    ambiguities.some(
      (item) =>
        typeof item !== "string" ||
        !clean(item),
    )
  ) {
    issues.push(
      "User audit intent ambiguities must contain only non-empty text.",
    );
  }

  const blockingAmbiguities =
    Array.isArray(input.blockingAmbiguities)
      ? input.blockingAmbiguities
      : [];
  if (
    blockingAmbiguities.some(
      (item) =>
        typeof item !== "string" ||
        !clean(item),
    )
  ) {
    issues.push(
      "User audit intent blockingAmbiguities must contain only non-empty text.",
    );
  }

  const unmappedFragmentIds =
    Array.isArray(input.unmappedFragmentIds)
      ? input.unmappedFragmentIds
      : [];
  const mappedFragmentIds = new Set(
    items.flatMap((item) =>
      item !== null &&
      typeof item === "object" &&
      Array.isArray(item.sourceFragmentIds)
        ? item.sourceFragmentIds
            .filter(
              (id): id is string =>
                typeof id === "string",
            )
            .map(clean)
        : [],
    ),
  );
  const unmappedSet = new Set<string>();
  for (const id of unmappedFragmentIds) {
    if (
      typeof id !== "string" ||
      !fragmentIds.has(clean(id))
    ) {
      issues.push(
        "User audit intent unmappedFragmentIds references unknown fragment id: " +
        String(id) +
        ".",
      );
      continue;
    }
    unmappedSet.add(clean(id));
  }

  for (const id of fragmentIds) {
    if (
      !mappedFragmentIds.has(id) &&
      !unmappedSet.has(id)
    ) {
      issues.push(
        "User audit intent fragment is unaccounted: " +
        id +
        ". Every material prompt fragment must be mapped or explicitly unmapped.",
      );
    }
  }

  const hasSymptom = items.some(
    (item) =>
      item !== null &&
      typeof item === "object" &&
      item.kind === "SYMPTOM_REPORT",
  );
  if (
    hasSymptom &&
    priorityDomains.length === 0 &&
    priorityPlayerFlows.length === 0 &&
    ambiguities.length === 0 &&
    blockingAmbiguities.length === 0
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
