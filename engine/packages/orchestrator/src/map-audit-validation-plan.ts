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

function requiresRuntime(
  finding: NeedValidationAuditIssueProjection,
): boolean {
  return finding.proofNavigation?.runtimeRequired === true;
}

function staticProofInstruction(
  finding: NeedValidationAuditIssueProjection,
): string {
  const step = finding.proofNavigation?.route.find(
    (item) => item.evidencePreference !== "runtime",
  );
  if (step === undefined) {
    return finding.validationTest;
  }
  return (
    "Resolve without Minecraft first: " +
    step.question +
    " " +
    step.purpose
  );
}

function decidingInstruction(
  finding: NeedValidationAuditIssueProjection,
): string {
  return requiresRuntime(finding)
    ? finding.validationTest
    : staticProofInstruction(finding);
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
    .map(([key, items]) => {
      const runtimeRequired =
        items.some(requiresRuntime);
      const verificationMode =
        runtimeRequired
          ? "NARROW_RUNTIME_VERIFICATION" as const
          : "STATIC_PROOF_COMPLETION" as const;
      return {
      key,
      verificationMode,
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
          ? decidingInstruction(items[0]!)
          : runtimeRequired
            ? "Use one shared setup for " +
              key +
              ", then execute only the runtime-required assertions in order. Resolve all remaining assertions statically first; do not expand this into a broad playthrough."
            : "Resolve all assertions from selected-artifact/cross-domain/formal evidence. Do not open Minecraft unless a later proof step explicitly becomes runtime-required.",
      assertions: items
        .map((item) => ({
          findingId: item.causalLinkId,
          test: decidingInstruction(item),
        }))
        .sort((a, b) =>
          a.findingId.localeCompare(b.findingId)
        ),
      missingProof: [
        ...new Set(
          items.map((item) => item.missingProof),
        ),
      ].sort(),
    };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}
