import { readFileSync } from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";
import {
  BUG_FINDER_CATEGORIES,
  BUG_REPORT_V2_FOUND_BY_VALUES,
  BUG_REPORT_V2_ISSUE_TYPES,
  BUG_REPORT_V2_REPAIR_BY_VALUES,
  BUG_SEVERITIES,
} from "../src/index.js";

interface EnumSchema {
  readonly enum?: readonly string[];
}

interface BugReportSchema {
  readonly properties?: {
    readonly repairBy?: EnumSchema;
  };
  readonly $defs?: {
    readonly bug?: {
      readonly properties?: {
        readonly severity?: EnumSchema;
        readonly category?: EnumSchema;
        readonly foundBy?: EnumSchema;
        readonly issueType?: EnumSchema;
      };
    };
  };
}

function schema(): BugReportSchema {
  const url = new URL(
    "../../../schemas/bug-report/v2.schema.json",
    import.meta.url,
  );
  return JSON.parse(readFileSync(url, "utf8")) as BugReportSchema;
}

describe("Bug Report V2 schema/runtime parity", () => {
  it("keeps canonical enum values aligned", () => {
    const value = schema();
    const bug = value.$defs?.bug?.properties;

    expect(value.properties?.repairBy?.enum)
      .toEqual(BUG_REPORT_V2_REPAIR_BY_VALUES);
    expect(bug?.severity?.enum)
      .toEqual(BUG_SEVERITIES);
    expect(bug?.category?.enum)
      .toEqual(BUG_FINDER_CATEGORIES);
    expect(bug?.foundBy?.enum)
      .toEqual(BUG_REPORT_V2_FOUND_BY_VALUES);
    expect(bug?.issueType?.enum)
      .toEqual(BUG_REPORT_V2_ISSUE_TYPES);
  });
});
