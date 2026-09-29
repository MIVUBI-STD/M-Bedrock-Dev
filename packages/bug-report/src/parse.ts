import type {
  BugFinderCategory,
  BugFoundBy,
  BugReportBug,
  BugReportV1,
  BugSeverity,
  BugVerification,
} from "./index.js";
import { validateBugReportSemantics } from "./index.js";

export type BugReportParseIssueCode =
  | "invalid-json"
  | "invalid-type"
  | "missing-field"
  | "unknown-field"
  | "invalid-value"
  | "semantic-error";

export interface BugReportParseIssue {
  readonly code: BugReportParseIssueCode;
  readonly path: string;
  readonly message: string;
}

export type BugReportParseResult =
  | {
      readonly ok: true;
      readonly report: BugReportV1;
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

const severities = new Set<BugSeverity>(["blocker", "major", "minor"]);
const origins = new Set<BugFoundBy>(["ai", "tester", "ai+tester"]);
const verifications = new Set<BugVerification>([
  "candidate",
  "observed",
  "verified",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function push(
  issues: BugReportParseIssue[],
  code: BugReportParseIssueCode,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: BugReportParseIssue[],
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      push(
        issues,
        "unknown-field",
        path ? path + "." + key : key,
        "Unknown field is not part of M-Bedrock Bug Report V1.",
      );
    }
  }
}

function requireString(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: BugReportParseIssue[],
): string | undefined {
  if (!(key in value)) {
    push(issues, "missing-field", path + "." + key, "Required field is missing.");
    return undefined;
  }
  const candidate = value[key];
  if (!nonEmptyString(candidate)) {
    push(
      issues,
      "invalid-type",
      path + "." + key,
      "Expected a non-empty string.",
    );
    return undefined;
  }
  return candidate;
}

function optionalStringArray(
  value: unknown,
  path: string,
  issues: BugReportParseIssue[],
): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((entry) => !nonEmptyString(entry))
  ) {
    push(
      issues,
      "invalid-type",
      path,
      "Expected a non-empty array of non-empty strings.",
    );
    return undefined;
  }
  return value;
}

function parseObserved(
  value: unknown,
  path: string,
  issues: BugReportParseIssue[],
): BugReportBug["observed"] | undefined {
  if (!isObject(value)) {
    push(issues, "invalid-type", path, "Expected an observation object.");
    return undefined;
  }

  rejectUnknownFields(value, ["gameplay", "code"], path, issues);

  const gameplay =
    value.gameplay === undefined
      ? undefined
      : nonEmptyString(value.gameplay)
        ? value.gameplay
        : undefined;
  const code =
    value.code === undefined
      ? undefined
      : nonEmptyString(value.code)
        ? value.code
        : undefined;

  if (value.gameplay !== undefined && gameplay === undefined) {
    push(issues, "invalid-type", path + ".gameplay", "Expected a non-empty string.");
  }
  if (value.code !== undefined && code === undefined) {
    push(issues, "invalid-type", path + ".code", "Expected a non-empty string.");
  }
  if (!gameplay && !code) {
    push(
      issues,
      "missing-field",
      path,
      "Observation requires gameplay or code evidence.",
    );
    return undefined;
  }

  return {
    ...(gameplay ? { gameplay } : {}),
    ...(code ? { code } : {}),
  };
}

function parseBug(
  value: unknown,
  path: string,
  issues: BugReportParseIssue[],
): BugReportBug | undefined {
  if (!isObject(value)) {
    push(issues, "invalid-type", path, "Expected a bug object.");
    return undefined;
  }

  rejectUnknownFields(
    value,
    [
      "title",
      "severity",
      "foundBy",
      "verification",
      "problem",
      "preconditions",
      "reproduction",
      "reproducibility",
      "expected",
      "observed",
      "evidence",
      "verifyBug",
      "codeFlow",
      "diagnosis",
      "rootCause",
      "relevantCode",
      "repairDirection",
      "mustPreserve",
      "fixValidation",
      "runtimeConditions",
    ],
    path,
    issues,
  );

  const title = requireString(value, "title", path, issues);
  const problem = requireString(value, "problem", path, issues);
  const expected = requireString(value, "expected", path, issues);

  const severity = value.severity;
  if (!severities.has(severity as BugSeverity)) {
    push(
      issues,
      "invalid-value",
      path + ".severity",
      "Expected blocker, major, or minor.",
    );
  }

  const foundBy = value.foundBy;
  if (!origins.has(foundBy as BugFoundBy)) {
    push(
      issues,
      "invalid-value",
      path + ".foundBy",
      "Expected ai, tester, or ai+tester.",
    );
  }

  const verification = value.verification;
  if (!verifications.has(verification as BugVerification)) {
    push(
      issues,
      "invalid-value",
      path + ".verification",
      "Expected candidate, observed, or verified.",
    );
  }

  const observed = parseObserved(value.observed, path + ".observed", issues);

  const preconditions = optionalStringArray(
    value.preconditions,
    path + ".preconditions",
    issues,
  );
  const reproduction = optionalStringArray(
    value.reproduction,
    path + ".reproduction",
    issues,
  );
  const verifyBug = optionalStringArray(
    value.verifyBug,
    path + ".verifyBug",
    issues,
  );
  const codeFlow = optionalStringArray(
    value.codeFlow,
    path + ".codeFlow",
    issues,
  );
  const mustPreserve = optionalStringArray(
    value.mustPreserve,
    path + ".mustPreserve",
    issues,
  );
  const fixValidation = optionalStringArray(
    value.fixValidation,
    path + ".fixValidation",
    issues,
  );

  let reproducibility: BugReportBug["reproducibility"];
  if (value.reproducibility !== undefined) {
    if (!isObject(value.reproducibility)) {
      push(
        issues,
        "invalid-type",
        path + ".reproducibility",
        "Expected an object.",
      );
    } else {
      rejectUnknownFields(
        value.reproducibility,
        ["attempts", "reproduced"],
        path + ".reproducibility",
        issues,
      );
      const attempts = value.reproducibility.attempts;
      const reproduced = value.reproducibility.reproduced;
      if (!Number.isInteger(attempts) || (attempts as number) < 1) {
        push(
          issues,
          "invalid-type",
          path + ".reproducibility.attempts",
          "Expected an integer of at least 1.",
        );
      }
      if (!Number.isInteger(reproduced) || (reproduced as number) < 0) {
        push(
          issues,
          "invalid-type",
          path + ".reproducibility.reproduced",
          "Expected a non-negative integer.",
        );
      }
      if (
        Number.isInteger(attempts) &&
        Number.isInteger(reproduced) &&
        (attempts as number) >= 1 &&
        (reproduced as number) >= 0
      ) {
        reproducibility = {
          attempts: attempts as number,
          reproduced: reproduced as number,
        };
      }
    }
  }

  let evidence: BugReportBug["evidence"];
  if (value.evidence !== undefined) {
    if (!Array.isArray(value.evidence) || value.evidence.length === 0) {
      push(issues, "invalid-type", path + ".evidence", "Expected a non-empty array.");
    } else {
      const parsed = value.evidence.flatMap((entry, index) => {
        const entryPath = path + ".evidence[" + index + "]";
        if (!isObject(entry)) {
          push(issues, "invalid-type", entryPath, "Expected an evidence object.");
          return [];
        }
        rejectUnknownFields(entry, ["description", "drive"], entryPath, issues);
        const description = requireString(entry, "description", entryPath, issues);
        const drive = requireString(entry, "drive", entryPath, issues);
        if (drive && !drive.startsWith("https://drive.google.com/")) {
          push(
            issues,
            "invalid-value",
            entryPath + ".drive",
            "Evidence link must be a Google Drive URL.",
          );
        }
        return description && drive ? [{ description, drive }] : [];
      });
      if (parsed.length === value.evidence.length) evidence = parsed;
    }
  }

  let relevantCode: BugReportBug["relevantCode"];
  if (value.relevantCode !== undefined) {
    if (!Array.isArray(value.relevantCode) || value.relevantCode.length === 0) {
      push(
        issues,
        "invalid-type",
        path + ".relevantCode",
        "Expected a non-empty array.",
      );
    } else {
      const parsed = value.relevantCode.flatMap((entry, index) => {
        const entryPath = path + ".relevantCode[" + index + "]";
        if (!isObject(entry)) {
          push(issues, "invalid-type", entryPath, "Expected a code-location object.");
          return [];
        }
        rejectUnknownFields(entry, ["file", "reason", "lines"], entryPath, issues);
        const file = requireString(entry, "file", entryPath, issues);
        const reason = requireString(entry, "reason", entryPath, issues);
        let lines: string | undefined;
        if (entry.lines !== undefined) {
          if (!nonEmptyString(entry.lines)) {
            push(
              issues,
              "invalid-type",
              entryPath + ".lines",
              "Expected a non-empty string.",
            );
          } else {
            lines = entry.lines;
          }
        }
        return file && reason
          ? [{ file, reason, ...(lines ? { lines } : {}) }]
          : [];
      });
      if (parsed.length === value.relevantCode.length) relevantCode = parsed;
    }
  }

  let runtimeConditions: BugReportBug["runtimeConditions"];
  if (value.runtimeConditions !== undefined) {
    if (!isObject(value.runtimeConditions)) {
      push(
        issues,
        "invalid-type",
        path + ".runtimeConditions",
        "Expected a runtime conditions object.",
      );
    } else {
      rejectUnknownFields(
        value.runtimeConditions,
        ["players", "activeArenas", "condition", "server", "mode"],
        path + ".runtimeConditions",
        issues,
      );
      const runtime: {
        players?: number;
        activeArenas?: number;
        condition?: string;
        server?: string;
        mode?: string;
      } = {};
      for (const key of ["players", "activeArenas"] as const) {
        const candidate = value.runtimeConditions[key];
        if (candidate !== undefined) {
          if (!Number.isInteger(candidate) || (candidate as number) < 1) {
            push(
              issues,
              "invalid-type",
              path + ".runtimeConditions." + key,
              "Expected an integer of at least 1.",
            );
          } else {
            runtime[key] = candidate as number;
          }
        }
      }
      for (const key of ["condition", "server", "mode"] as const) {
        const candidate = value.runtimeConditions[key];
        if (candidate !== undefined) {
          if (!nonEmptyString(candidate)) {
            push(
              issues,
              "invalid-type",
              path + ".runtimeConditions." + key,
              "Expected a non-empty string.",
            );
          } else {
            runtime[key] = candidate;
          }
        }
      }
      if (Object.keys(runtime).length === 0) {
        push(
          issues,
          "missing-field",
          path + ".runtimeConditions",
          "Runtime conditions cannot be empty.",
        );
      } else {
        runtimeConditions = runtime;
      }
    }
  }

  const optionalText = (key: string): string | undefined => {
    const candidate = value[key];
    if (candidate === undefined) return undefined;
    if (!nonEmptyString(candidate)) {
      push(issues, "invalid-type", path + "." + key, "Expected a non-empty string.");
      return undefined;
    }
    return candidate;
  };

  const diagnosis = optionalText("diagnosis");
  const rootCause = optionalText("rootCause");
  const repairDirection = optionalText("repairDirection");

  if (
    !title ||
    !problem ||
    !expected ||
    !observed ||
    !severities.has(severity as BugSeverity) ||
    !origins.has(foundBy as BugFoundBy) ||
    !verifications.has(verification as BugVerification)
  ) {
    return undefined;
  }

  return {
    title,
    severity: severity as BugSeverity,
    foundBy: foundBy as BugFoundBy,
    verification: verification as BugVerification,
    problem,
    expected,
    observed,
    ...(preconditions ? { preconditions } : {}),
    ...(reproduction ? { reproduction } : {}),
    ...(reproducibility ? { reproducibility } : {}),
    ...(evidence ? { evidence } : {}),
    ...(verifyBug ? { verifyBug } : {}),
    ...(codeFlow ? { codeFlow } : {}),
    ...(diagnosis ? { diagnosis } : {}),
    ...(rootCause ? { rootCause } : {}),
    ...(relevantCode ? { relevantCode } : {}),
    ...(repairDirection ? { repairDirection } : {}),
    ...(mustPreserve ? { mustPreserve } : {}),
    ...(fixValidation ? { fixValidation } : {}),
    ...(runtimeConditions ? { runtimeConditions } : {}),
  };
}

export function parseBugReportV1(input: unknown): BugReportParseResult {
  const issues: BugReportParseIssue[] = [];

  if (!isObject(input)) {
    return {
      ok: false,
      issues: [
        {
          code: "invalid-type",
          path: "$",
          message: "Bug report root must be an object.",
        },
      ],
    };
  }

  rejectUnknownFields(input, ["schema", "map", "bugFinders"], "$", issues);

  if (input.schema !== "m-bedrock-bug-report/v1") {
    push(
      issues,
      "invalid-value",
      "$.schema",
      "Expected m-bedrock-bug-report/v1.",
    );
  }

  let map: BugReportV1["map"] | undefined;
  if (!isObject(input.map)) {
    push(issues, "invalid-type", "$.map", "Expected a map object.");
  } else {
    rejectUnknownFields(
      input.map,
      ["name", "version", "minecraftVersion", "drive"],
      "$.map",
      issues,
    );
    const name = requireString(input.map, "name", "$.map", issues);
    const version = requireString(input.map, "version", "$.map", issues);
    const minecraftVersion = requireString(
      input.map,
      "minecraftVersion",
      "$.map",
      issues,
    );
    const drive = requireString(input.map, "drive", "$.map", issues);
    if (drive && !drive.startsWith("https://drive.google.com/")) {
      push(
        issues,
        "invalid-value",
        "$.map.drive",
        "Map link must be a Google Drive URL.",
      );
    }
    if (name && version && minecraftVersion && drive) {
      map = { name, version, minecraftVersion, drive };
    }
  }

  const bugFinders: BugReportV1["bugFinders"][number][] = [];
  if (!Array.isArray(input.bugFinders)) {
    push(issues, "invalid-type", "$.bugFinders", "Expected an array.");
  } else {
    input.bugFinders.forEach((finder, finderIndex) => {
      const path = "$.bugFinders[" + finderIndex + "]";
      if (!isObject(finder)) {
        push(issues, "invalid-type", path, "Expected a bug finder object.");
        return;
      }
      rejectUnknownFields(finder, ["category", "bugs"], path, issues);
      const category = finder.category;
      if (!categories.has(category as BugFinderCategory)) {
        push(
          issues,
          "invalid-value",
          path + ".category",
          "Unknown bug finder category.",
        );
        return;
      }
      if (!Array.isArray(finder.bugs)) {
        push(issues, "invalid-type", path + ".bugs", "Expected an array.");
        return;
      }
      const bugs = finder.bugs.flatMap((bug, bugIndex) => {
        const parsed = parseBug(
          bug,
          path + ".bugs[" + bugIndex + "]",
          issues,
        );
        return parsed ? [parsed] : [];
      });
      bugFinders.push({
        category: category as BugFinderCategory,
        bugs,
      });
    });
  }

  if (issues.length > 0 || !map) {
    return { ok: false, issues };
  }

  const report: BugReportV1 = {
    schema: "m-bedrock-bug-report/v1",
    map,
    bugFinders,
  };

  const semantic = validateBugReportSemantics(report);
  if (!semantic.valid) {
    return {
      ok: false,
      issues: semantic.issues.map((issue) => ({
        code: "semantic-error",
        path: "$." + issue.path,
        message: issue.message,
      })),
    };
  }

  return { ok: true, report, issues: [] };
}

export function parseBugReportJson(text: string): BugReportParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return {
      ok: false,
      issues: [
        {
          code: "invalid-json",
          path: "$",
          message: "Input is not valid JSON.",
        },
      ],
    };
  }
  return parseBugReportV1(value);
}
