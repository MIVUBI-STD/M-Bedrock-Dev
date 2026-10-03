import type {
  GameplayIssueFlowStage,
  GameplayReportIssueType,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  NeedValidationAuditIssueProjection,
} from "./map-audit-issue-projection.js";

export interface AuditValidationTestGroup {
  readonly key: string;
  readonly findingIds: readonly string[];
  readonly issueTypes: readonly GameplayReportIssueType[];
  readonly gameplayFlows: readonly GameplayIssueFlowStage[];
  readonly test: string;
  readonly missingProof: readonly string[];
}

export function groupNeedValidationTests(
  findings: readonly NeedValidationAuditIssueProjection[],
): readonly AuditValidationTestGroup[] {
  const groups = new Map<
    string,
    NeedValidationAuditIssueProjection[]
  >();

  for (const finding of findings) {
    const current =
      groups.get(finding.validationGroupKey) ?? [];
    current.push(finding);
    groups.set(
      finding.validationGroupKey,
      current,
    );
  }

  return [...groups.entries()]
    .map(([key, items]) => ({
      key,
      findingIds: [
        ...new Set(
          items.map((item) => item.causalLinkId),
        ),
      ].sort(),
      issueTypes: [
        ...new Set(
          items.map((item) => item.issueType),
        ),
      ].sort(),
      gameplayFlows: [
        ...new Set(
          items.map((item) => item.gameplayFlow),
        ),
      ].sort(),
      test:
        items.length === 1
          ? items[0]!.validationTest
          : "Run one consolidated scenario for " +
            key +
            " and verify all unresolved dependencies covered by findings: " +
            items
              .map((item) => item.causalLinkId)
              .sort()
              .join(", ") +
            ".",
      missingProof: [
        ...new Set(
          items.map((item) => item.missingProof),
        ),
      ].sort(),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
