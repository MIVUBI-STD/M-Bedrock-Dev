import type { BugFinderCategory, BugSeverity } from "./index.js";
import type { BugReportParseIssue } from "./parse.js";

export const BUG_REPORT_V2_SCHEMA = "m-bedrock-bug-report/v2" as const;

export type BugRepairOwner = "chatgpt" | "developer";
export type BugOrigin = "ai" | "tester";

export interface BugReportV2Map {
  readonly name: string;
  readonly mapVersion: string;
  readonly baseVersion: string;
  readonly testedVersion: string;
}

export interface BugReportV2RelevantCode {
  readonly file: string;
  readonly reason: string;
}

export interface BugReportV2Issue {
  readonly id: string;
  readonly fixed: boolean;
  readonly severity: BugSeverity;
  readonly category: BugFinderCategory;
  readonly foundBy: BugOrigin;
  readonly title: string;
  readonly problem: string;
  readonly expected: string;
  readonly observed: string;
  readonly reproduction?: readonly string[];
  readonly aiAnalysis?: string;
  readonly relevantCode?: readonly BugReportV2RelevantCode[];
  readonly suggestedFix?: string;
  readonly mustPreserve?: readonly string[];
}

export interface BugReportV2 {
  readonly schema: typeof BUG_REPORT_V2_SCHEMA;
  readonly map: BugReportV2Map;
  readonly repairBy: BugRepairOwner;
  readonly issues: readonly BugReportV2Issue[];
}

export type BugReportV2ParseResult =
  | {
      readonly ok: true;
      readonly report: BugReportV2;
      readonly issues: readonly [];
    }
  | {
      readonly ok: false;
      readonly issues: readonly BugReportParseIssue[];
    };

const categories = new Set<BugFinderCategory>([
  "game-flow",
  "player-state",
  "multiplayer-session",
  "world-interaction",
  "entity-behavior",
  "combat",
  "score-reward",
  "ui-feedback",
  "performance-stability",
  "compatibility",
]);

const severities = new Set<BugSeverity>([
  "blocker",
  "major",
  "minor",
]);

const repairOwners = new Set<BugRepairOwner>([
  "chatgpt",
  "developer",
]);

const origins = new Set<BugOrigin>([
  "ai",
  "tester",
]);

function object(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(
  value: unknown,
): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function rejectUnknown(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: BugReportParseIssue[],
): void {
  const set = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!set.has(key)) {
      issues.push({
        code: "unknown-field",
        path: path + "." + key,
        message: "Unknown field is not part of M-Bedrock Bug Report V2.",
      });
    }
  }
}

function requiredText(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: BugReportParseIssue[],
): string | undefined {
  if (!text(value[key])) {
    issues.push({
      code: key in value ? "invalid-type" : "missing-field",
      path: path + "." + key,
      message: "Expected a non-empty string.",
    });
    return undefined;
  }
  return value[key];
}

function stringList(
  value: unknown,
  path: string,
  issues: BugReportParseIssue[],
): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => !text(item))
  ) {
    issues.push({
      code: "invalid-type",
      path,
      message: "Expected a non-empty array of non-empty strings.",
    });
    return undefined;
  }
  return value;
}

function parseMap(
  value: unknown,
  issues: BugReportParseIssue[],
): BugReportV2Map | undefined {
  if (!object(value)) {
    issues.push({
      code: "invalid-type",
      path: "map",
      message: "Expected a map object.",
    });
    return undefined;
  }

  rejectUnknown(
    value,
    ["name", "mapVersion", "baseVersion", "testedVersion"],
    "map",
    issues,
  );

  const name = requiredText(value, "name", "map", issues);
  const mapVersion = requiredText(value, "mapVersion", "map", issues);
  const baseVersion = requiredText(value, "baseVersion", "map", issues);
  const testedVersion = requiredText(value, "testedVersion", "map", issues);

  return name && mapVersion && baseVersion && testedVersion
    ? { name, mapVersion, baseVersion, testedVersion }
    : undefined;
}

function parseRelevantCode(
  value: unknown,
  path: string,
  issues: BugReportParseIssue[],
): readonly BugReportV2RelevantCode[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({
      code: "invalid-type",
      path,
      message: "Expected a non-empty relevantCode array.",
    });
    return undefined;
  }

  const parsed: BugReportV2RelevantCode[] = [];
  value.forEach((entry, index) => {
    const itemPath = path + "[" + index + "]";
    if (!object(entry)) {
      issues.push({
        code: "invalid-type",
        path: itemPath,
        message: "Expected a relevant code object.",
      });
      return;
    }
    rejectUnknown(entry, ["file", "reason"], itemPath, issues);
    const file = requiredText(entry, "file", itemPath, issues);
    const reason = requiredText(entry, "reason", itemPath, issues);
    if (file && reason) parsed.push({ file, reason });
  });

  return parsed.length === value.length ? parsed : undefined;
}

function parseIssue(
  value: unknown,
  index: number,
  issues: BugReportParseIssue[],
): BugReportV2Issue | undefined {
  const path = "issues[" + index + "]";
  if (!object(value)) {
    issues.push({
      code: "invalid-type",
      path,
      message: "Expected a bug object.",
    });
    return undefined;
  }

  rejectUnknown(
    value,
    [
      "id",
      "fixed",
      "severity",
      "category",
      "foundBy",
      "title",
      "problem",
      "expected",
      "observed",
      "reproduction",
      "aiAnalysis",
      "relevantCode",
      "suggestedFix",
      "mustPreserve",
    ],
    path,
    issues,
  );

  const id = requiredText(value, "id", path, issues);
  const title = requiredText(value, "title", path, issues);
  const problem = requiredText(value, "problem", path, issues);
  const expected = requiredText(value, "expected", path, issues);
  const observed = requiredText(value, "observed", path, issues);

  if (typeof value.fixed !== "boolean") {
    issues.push({
      code: "invalid-type",
      path: path + ".fixed",
      message: "Expected true or false.",
    });
  }

  if (!severities.has(value.severity as BugSeverity)) {
    issues.push({
      code: "invalid-value",
      path: path + ".severity",
      message: "Expected blocker, major, or minor.",
    });
  }

  if (!categories.has(value.category as BugFinderCategory)) {
    issues.push({
      code: "invalid-value",
      path: path + ".category",
      message: "Unknown bug category.",
    });
  }

  if (!origins.has(value.foundBy as BugOrigin)) {
    issues.push({
      code: "invalid-value",
      path: path + ".foundBy",
      message: "Expected ai or tester.",
    });
  }

  const reproduction = stringList(
    value.reproduction,
    path + ".reproduction",
    issues,
  );
  const mustPreserve = stringList(
    value.mustPreserve,
    path + ".mustPreserve",
    issues,
  );
  const relevantCode = parseRelevantCode(
    value.relevantCode,
    path + ".relevantCode",
    issues,
  );

  const aiAnalysis =
    value.aiAnalysis === undefined
      ? undefined
      : requiredText(value, "aiAnalysis", path, issues);
  const suggestedFix =
    value.suggestedFix === undefined
      ? undefined
      : requiredText(value, "suggestedFix", path, issues);

  if (
    !id ||
    typeof value.fixed !== "boolean" ||
    !severities.has(value.severity as BugSeverity) ||
    !categories.has(value.category as BugFinderCategory) ||
    !origins.has(value.foundBy as BugOrigin) ||
    !title ||
    !problem ||
    !expected ||
    !observed
  ) {
    return undefined;
  }

  return {
    id,
    fixed: value.fixed,
    severity: value.severity as BugSeverity,
    category: value.category as BugFinderCategory,
    foundBy: value.foundBy as BugOrigin,
    title,
    problem,
    expected,
    observed,
    ...(reproduction === undefined ? {} : { reproduction }),
    ...(aiAnalysis === undefined ? {} : { aiAnalysis }),
    ...(relevantCode === undefined ? {} : { relevantCode }),
    ...(suggestedFix === undefined ? {} : { suggestedFix }),
    ...(mustPreserve === undefined ? {} : { mustPreserve }),
  };
}

export function parseBugReportV2(
  value: unknown,
): BugReportV2ParseResult {
  const issues: BugReportParseIssue[] = [];

  if (!object(value)) {
    return {
      ok: false,
      issues: [{
        code: "invalid-type",
        path: "$",
        message: "Bug report must be an object.",
      }],
    };
  }

  rejectUnknown(
    value,
    ["schema", "map", "repairBy", "issues"],
    "$",
    issues,
  );

  if (value.schema !== BUG_REPORT_V2_SCHEMA) {
    issues.push({
      code: "invalid-value",
      path: "$.schema",
      message: "Expected " + BUG_REPORT_V2_SCHEMA + ".",
    });
  }

  if (!repairOwners.has(value.repairBy as BugRepairOwner)) {
    issues.push({
      code: "invalid-value",
      path: "$.repairBy",
      message: "Expected chatgpt or developer.",
    });
  }

  const map = parseMap(value.map, issues);

  if (!Array.isArray(value.issues) || value.issues.length === 0) {
    issues.push({
      code: "invalid-type",
      path: "$.issues",
      message: "Expected at least one confirmed bug.",
    });
  }

  const parsedIssues =
    Array.isArray(value.issues)
      ? value.issues.flatMap((entry, index) => {
          const parsed = parseIssue(entry, index, issues);
          return parsed ? [parsed] : [];
        })
      : [];

  const ids = new Set<string>();
  parsedIssues.forEach((issue, index) => {
    if (ids.has(issue.id)) {
      issues.push({
        code: "semantic-error",
        path: "issues[" + index + "].id",
        message: "Bug ids must be unique within one report.",
      });
    }
    ids.add(issue.id);
  });

  if (
    issues.length > 0 ||
    !map ||
    !repairOwners.has(value.repairBy as BugRepairOwner) ||
    !Array.isArray(value.issues) ||
    parsedIssues.length !== value.issues.length
  ) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    report: {
      schema: BUG_REPORT_V2_SCHEMA,
      map,
      repairBy: value.repairBy as BugRepairOwner,
      issues: parsedIssues,
    },
    issues: [],
  };
}

export function parseBugReportV2Json(
  source: string,
): BugReportV2ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return {
      ok: false,
      issues: [{
        code: "invalid-json",
        path: "$",
        message: "Input is not valid JSON.",
      }],
    };
  }
  return parseBugReportV2(value);
}

const severityRank: Readonly<Record<BugSeverity, number>> = {
  blocker: 0,
  major: 1,
  minor: 2,
};

export function normalizeBugReportV2(
  report: BugReportV2,
): BugReportV2 {
  return {
    ...report,
    issues: [...report.issues].sort((left, right) => {
      const severity = severityRank[left.severity] - severityRank[right.severity];
      if (severity !== 0) return severity;
      return left.id.localeCompare(right.id);
    }),
  };
}

export function serializeBugReportV2(
  report: BugReportV2,
): BugReportV2ParseResult & { readonly json?: string } {
  const parsed = parseBugReportV2(report);
  if (!parsed.ok) return parsed;
  const normalized = normalizeBugReportV2(parsed.report);
  return {
    ok: true,
    report: normalized,
    json: JSON.stringify(normalized, null, 2) + "\n",
    issues: [],
  };
}

export function bugReportV2Progress(
  report: BugReportV2,
): {
  readonly fixed: number;
  readonly total: number;
  readonly complete: boolean;
} {
  const fixed = report.issues.filter((issue) => issue.fixed).length;
  return {
    fixed,
    total: report.issues.length,
    complete: fixed === report.issues.length,
  };
}
