import type {
  GameplayIssueFlowStage,
  GameplayReportIssueType,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  NeedValidationAuditIssueProjection,
} from "./map-audit-issue-projection.js";

export interface AuditValidationTestGroup {
  readonly key: string;
  readonly verificationMode:
    | "STATIC_PROOF_COMPLETION"
    | "NARROW_RUNTIME_VERIFICATION";
  readonly broadPlaythroughAllowed: false;
  readonly findingIds: readonly string[];
  readonly issueTypes: readonly GameplayReportIssueType[];
  readonly gameplayFlows: readonly GameplayIssueFlowStage[];
  readonly test: string;
  readonly assertions: readonly {
    readonly findingId: string;
    readonly test: string;
  }[];
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
      verificationMode:
        items.some(
          (item) =>
            item.proofNavigation?.runtimeLastResort === true,
        )
          ? "NARROW_RUNTIME_VERIFICATION" as const
          : "STATIC_PROOF_COMPLETION" as const,
      broadPlaythroughAllowed: false as const,
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
          : "Use one shared setup for " +
            key +
            ", then execute every exact finding assertion in order. Stop when each deciding assertion is resolved; do not expand this into a broad playthrough.",
      assertions: items
        .map((item) => ({
          findingId: item.causalLinkId,
          test: item.validationTest,
        }))
        .sort((a, b) =>
          a.findingId.localeCompare(b.findingId)
        ),
      missingProof: [
        ...new Set(
          items.map((item) => item.missingProof),
        ),
      ].sort(),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
