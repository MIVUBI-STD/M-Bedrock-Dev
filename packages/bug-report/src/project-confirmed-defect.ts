import {
  classifyBugSeverity,
  routeBugFinderCategory,
} from "./decision.js";
import {
  validateConfirmedDefect,
  type ConfirmedDefect,
} from "./confirmed-defect.js";
import {
  promoteConfirmedBugsToV2,
  type ConfirmedBugReportInput,
  type PromoteConfirmedBugsResult,
} from "./promote-v2.js";
import type {
  BugReportV2Map,
  BugReportV2RepairBy,
} from "./v2.js";

function slug(value: string): string {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "MAP";
}

function mapPrefix(mapName: string): string {
  const words = slug(mapName)
    .split("-")
    .filter(Boolean);
  if (words.length === 1) {
    return words[0]!.slice(0, 4);
  }
  return words
    .slice(0, 4)
    .map((word) => word[0])
    .join("");
}

function stableSemanticHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0)
    .toString(36)
    .toUpperCase()
    .padStart(7, "0");
}

export function allocateBugIds(
  mapName: string,
  defects: readonly ConfirmedDefect[],
): ReadonlyMap<string, string> {
  const prefix = mapPrefix(mapName);
  const entries = defects.map((defect) => [
    defect.semanticKey,
    "BUG-" +
      prefix +
      "-" +
      stableSemanticHash(defect.semanticKey),
  ] as const);

  const ids = new Set<string>();
  for (const [, id] of entries) {
    if (ids.has(id)) {
      throw new Error(
        "Deterministic bug id collision detected: " + id + ".",
      );
    }
    ids.add(id);
  }

  return new Map(entries);
}

export function projectConfirmedDefects(
  map: BugReportV2Map,
  defects: readonly ConfirmedDefect[],
): readonly ConfirmedBugReportInput[] {
  const ids = allocateBugIds(map.name, defects);

  return defects.map((defect) => ({
    status: "confirmed-defect",
    confirmation: defect.confirmation,
    id: ids.get(defect.semanticKey)!,
    severity: classifyBugSeverity(defect.impact),
    category: routeBugFinderCategory(defect.primaryFailure),
    foundBy: defect.foundBy,
    title: defect.title,
    problem: defect.problem,
    expected: defect.expected.statement,
    observed: defect.observed.statement,
    ...(defect.reproduction === undefined
      ? {}
      : { reproduction: defect.reproduction }),
    ...(defect.aiAnalysis === undefined
      ? {}
      : { aiAnalysis: defect.aiAnalysis }),
    ...(defect.sourceEvidence === undefined
      ? {}
      : {
          relevantCode: defect.sourceEvidence.map((item) => ({
            file: item.source.relativePath,
            reason: item.reason,
          })),
        }),
    ...(defect.suggestedFix === undefined
      ? {}
      : { suggestedFix: defect.suggestedFix }),
    ...(defect.mustPreserve === undefined
      ? {}
      : { mustPreserve: defect.mustPreserve }),
  }));
}

export function buildBugReportFromConfirmedDefects(
  input: {
    readonly map: BugReportV2Map;
    readonly repairBy: BugReportV2RepairBy;
    readonly defects: readonly ConfirmedDefect[];
  },
): PromoteConfirmedBugsResult {
  const issues: {
    code:
      | "invalid-confirmed-defect"
      | "duplicate-semantic-key";
    message: string;
  }[] = [];
  const seen = new Set<string>();

  for (const defect of input.defects) {
    for (const error of validateConfirmedDefect(defect)) {
      issues.push({
        code: "invalid-confirmed-defect",
        message:
          defect.semanticKey + ": " + error,
      });
    }
    if (seen.has(defect.semanticKey)) {
      issues.push({
        code: "duplicate-semantic-key",
        message:
          "Confirmed defect semanticKey must be unique: " +
          defect.semanticKey +
          ".",
      });
    }
    seen.add(defect.semanticKey);
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    };
  }

  return promoteConfirmedBugsToV2({
    map: input.map,
    repairBy: input.repairBy,
    bugs: projectConfirmedDefects(
      input.map,
      input.defects,
    ),
  });
}
