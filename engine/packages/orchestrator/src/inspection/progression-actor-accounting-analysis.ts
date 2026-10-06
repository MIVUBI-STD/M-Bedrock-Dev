import type {
  ParsedScriptFile,
} from "../../../../analyzers/scripts/src/index.js";

export type ProgressionCounterKind =
  | "variable"
  | "scoreboard";

export type ProgressionCounterStatus =
  | "balanced-evidence"
  | "missing-reconciliation"
  | "unresolved";

export interface ProgressionCounterAssessment {
  readonly scriptId: string;
  readonly counterId: string;
  readonly kind: ProgressionCounterKind;
  readonly growthWrites: number;
  readonly decrementWrites: number;
  readonly replacementWrites: number;
  readonly completionChecks: number;
  readonly status: ProgressionCounterStatus;
  readonly reasons: readonly string[];
}

export interface ProgressionActorAccountingAnalysis {
  readonly counters: readonly ProgressionCounterAssessment[];
  readonly provenMissingReconciliation: number;
  readonly unresolvedCounters: number;
  readonly balancedCounters: number;
}

export type ProgressionActorAccountingInput =
  | ParsedScriptFile
  | {
      readonly parsed: ParsedScriptFile;
      readonly text?: string;
    };

const COUNTER_NAME =
  /(?:wave|enemy|enemies|mob|mobs|remaining|alive|objective|progress|count)/i;

function normalizedInput(
  input: ProgressionActorAccountingInput,
): {
  readonly parsed: ParsedScriptFile;
  readonly text: string;
} {
  return "parsed" in input
    ? {
        parsed: input.parsed,
        text: input.text ?? "",
      }
    : {
        parsed: input,
        text: "",
      };
}

function add(
  map: Map<string, ProgressionCounterAssessment>,
  values: Omit<
    ProgressionCounterAssessment,
    "status" | "reasons"
  >,
): void {
  const key =
    values.kind + ":" + values.counterId;
  const current = map.get(key);
  const growthWrites =
    (current?.growthWrites ?? 0) +
    values.growthWrites;
  const decrementWrites =
    (current?.decrementWrites ?? 0) +
    values.decrementWrites;
  const replacementWrites =
    (current?.replacementWrites ?? 0) +
    values.replacementWrites;
  const completionChecks =
    (current?.completionChecks ?? 0) +
    values.completionChecks;

  const missingReconciliation =
    growthWrites > 0 &&
    completionChecks > 0 &&
    decrementWrites === 0 &&
    replacementWrites === 0;
  const balanced =
    growthWrites > 0 &&
    completionChecks > 0 &&
    decrementWrites > 0;

  map.set(key, {
    scriptId: values.scriptId,
    counterId: values.counterId,
    kind: values.kind,
    growthWrites,
    decrementWrites,
    replacementWrites,
    completionChecks,
    status:
      missingReconciliation
        ? "missing-reconciliation"
        : balanced
          ? "balanced-evidence"
          : "unresolved",
    reasons:
      missingReconciliation
        ? [
            "A progression-like counter grows and gates completion at zero, but no selected-artifact decrement or replacement/recompute write for that counter was found.",
          ]
        : balanced
          ? [
              "The counter has growth, a completion gate, and at least one selected-artifact decrement path.",
            ]
          : [
              replacementWrites > 0
                ? "The counter has replacement/set writes that may be initialization, reset, or recomputation. Their lifecycle role is unresolved, so they cannot be credited as actor reconciliation without source-side ownership proof."
                : "The source exposes only part of the counter lifecycle; do not classify it safe or defective until producer/consumer/reconciliation evidence is complete.",
            ],
  });
}

function scoreboardEvidence(
  scriptId: string,
  text: string,
): ProgressionCounterAssessment[] {
  const map =
    new Map<string, ProgressionCounterAssessment>();
  const commandPattern =
    /scoreboard\s+players\s+(add|remove|set)\s+\S+\s+([A-Za-z0-9_.:-]+)\s+(-?\d+)/gi;

  for (const match of text.matchAll(commandPattern)) {
    const operation =
      match[1]!.toLowerCase();
    const objective =
      match[2]!;
    if (!COUNTER_NAME.test(objective)) {
      continue;
    }
    const value = Number(match[3]!);
    add(map, {
      scriptId,
      counterId: objective,
      kind: "scoreboard",
      growthWrites:
        operation === "add" && value > 0
          ? 1
          : 0,
      decrementWrites:
        (
          operation === "remove" &&
          value > 0
        ) ||
        (
          operation === "add" &&
          value < 0
        )
          ? 1
          : 0,
      replacementWrites:
        operation === "set"
          ? 1
          : 0,
      completionChecks: 0,
    });
  }

  const checkPattern =
    /(?:if|unless)\s+score\s+\S+\s+([A-Za-z0-9_.:-]+)\s+matches\s+(?:\.\.)?0(?:\b|\.\.)/gi;
  for (const match of text.matchAll(checkPattern)) {
    const objective = match[1]!;
    if (!COUNTER_NAME.test(objective)) {
      continue;
    }
    add(map, {
      scriptId,
      counterId: objective,
      kind: "scoreboard",
      growthWrites: 0,
      decrementWrites: 0,
      replacementWrites: 0,
      completionChecks: 1,
    });
  }

  return [...map.values()];
}

function variableNames(
  text: string,
): string[] {
  const names = new Set<string>();
  const pattern =
    /\b([A-Za-z_$][\w$]*(?:wave|enemy|enemies|mob|mobs|remaining|alive|objective|progress|count)[\w$]*)\b/gi;
  for (const match of text.matchAll(pattern)) {
    names.add(match[1]!);
  }
  return [...names].sort();
}

function countMatches(
  text: string,
  pattern: RegExp,
): number {
  return [...text.matchAll(pattern)].length;
}

function escapeRegex(
  value: string,
): string {
  return value.replace(
    /[.*+?^$()|[\]\\{}]/g,
    "\\$&",
  );
}

function variableEvidence(
  scriptId: string,
  text: string,
): ProgressionCounterAssessment[] {
  return variableNames(text).map((name) => {
    const escaped =
      escapeRegex(name);
    const growthWrites =
      countMatches(
        text,
        new RegExp(
          "(?:\\b" +
            escaped +
            "\\s*\\+\\+|\\b" +
            escaped +
            "\\s*\\+=\\s*[1-9]\\d*)",
          "g",
        ),
      );
    const decrementWrites =
      countMatches(
        text,
        new RegExp(
          "(?:\\b" +
            escaped +
            "\\s*--|\\b" +
            escaped +
            "\\s*-=\\s*[1-9]\\d*)",
          "g",
        ),
      );
    const completionChecks =
      countMatches(
        text,
        new RegExp(
          "\\b" +
            escaped +
            "\\s*(?:===|==|<=)\\s*0\\b",
          "g",
        ),
      ) +
      countMatches(
        text,
        new RegExp(
          "\\b0\\s*(?:===|==|>=)\\s*" +
            escaped +
            "\\b",
          "g",
        ),
      );

    const assignmentPattern =
      new RegExp(
        "\\b" +
          escaped +
          "\\s*=\\s*([^;\\n]+)",
        "g",
      );
    let replacementWrites = 0;
    for (
      const match of
        text.matchAll(assignmentPattern)
    ) {
      const rhs = match[1]!.trim();
      if (
        /^-?\d+(?:\.\d+)?$/.test(rhs)
      ) {
        continue;
      }
      replacementWrites += 1;
    }

    const map =
      new Map<string, ProgressionCounterAssessment>();
    add(map, {
      scriptId,
      counterId: name,
      kind: "variable",
      growthWrites,
      decrementWrites,
      replacementWrites,
      completionChecks,
    });
    return [...map.values()][0]!;
  }).filter((item) =>
    item.growthWrites > 0 ||
    item.decrementWrites > 0 ||
    item.replacementWrites > 0 ||
    item.completionChecks > 0
  );
}

export function analyzeProgressionActorAccounting(
  inputs:
    readonly ProgressionActorAccountingInput[],
): ProgressionActorAccountingAnalysis {
  const counters = inputs
    .flatMap((input) => {
      const { parsed, text } =
        normalizedInput(input);
      if (!text.trim()) return [];
      return [
        ...scoreboardEvidence(
          parsed.identifier,
          text,
        ),
        ...variableEvidence(
          parsed.identifier,
          text,
        ),
      ];
    })
    .sort((a, b) =>
      a.scriptId.localeCompare(b.scriptId) ||
      a.counterId.localeCompare(
        b.counterId,
      ) ||
      a.kind.localeCompare(b.kind)
    );

  return {
    counters,
    provenMissingReconciliation:
      counters.filter(
        (item) =>
          item.status ===
          "missing-reconciliation",
      ).length,
    unresolvedCounters:
      counters.filter(
        (item) =>
          item.status === "unresolved",
      ).length,
    balancedCounters:
      counters.filter(
        (item) =>
          item.status ===
          "balanced-evidence",
      ).length,
  };
}
