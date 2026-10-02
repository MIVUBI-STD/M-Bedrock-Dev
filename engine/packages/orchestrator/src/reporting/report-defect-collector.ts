        issues.push({
          code: "invalid-confirmed-defect",
          message:
            defect.semanticKey +
            ": source evidence path is not present in the audited file inventory: " +
            path +
            ".",
        });
        continue;
      }

      if (
        defect.foundBy === "ai" &&
        lineAddressableSource(path) &&
        !sourceRefHasPreciseLocation(item.source)
      ) {
        issues.push({
          code: "invalid-confirmed-defect",
          message:
            defect.semanticKey +
            ": line-addressable AI source evidence must include a precise range or location: " +
            path +
            ".",
        });
      }
    }
  }

  return issues;
}

/**
 * @deprecated Engine-internal compatibility route. Production callers must
 * start with runSelectedMapAudit() and continue with prepareSelectedMapAuditReview().
 */
export function prepareBugReportReviewFromAuditCandidatesCompatibility(
  input: Omit<
    BuildBugReportFromAuditInput,
    "repairBy" | "approved"
  >,
): PrepareBugReportReviewFromAuditResult {
  const collection = collectConfirmedDefects(
    input.candidates,
    input.engineeringAnalyses ?? [],
  );

  return {
    collection,
    proposed: projectProposedBugSet(
      input.map,
      collection.confirmed,
    ),
  };
}

export type PrepareBugReportReviewFromClosedAuditInput =
  Omit<
    BuildBugReportFromClosedAuditInput,
    "repairBy" | "approved"
  >;

export type PrepareBugReportReviewFromClosedAuditResult =
  | PrepareBugReportReviewFromAuditResult
  | {
      readonly collection:
        ConfirmedDefectCollection;
      readonly proposed?: never;
      readonly blocked: true;
      readonly reasons: readonly string[];
    };

export function prepareBugReportReviewFromAuditCandidates(
  input:
    PrepareBugReportReviewFromClosedAuditInput,
): PrepareBugReportReviewFromClosedAuditResult {
  const closureIssues = [
    ...mandatoryAuditProcedurePublicationIssues(
      input.mandatoryAuditProcedure,
    ),
    ...gameplayDiscoveryPublicationIssues(
      input.gameplayDiscoveryClosure,
    ),
    ...gameplayClosurePublicationIssues(
      input.gameplayClosure,
    ),
    ...gameplayScenarioPublicationIssues(
      input.gameplayScenarioClosure,
    ),
    ...gameplayDefectResolutionPublicationIssues(
      input.gameplayDefectResolution,
    ),
    ...gameplayDefectCandidateCoverageIssues(
      input.gameplayDefectResolution,
      input.candidates,
    ),
  ];

  if (closureIssues.length > 0) {
    return {
      collection: collectConfirmedDefects(
        input.candidates,
        input.engineeringAnalyses ?? [],
      ),
      blocked: true,
      reasons: closureIssues.map(
        (issue) => issue.message,
      ),
    };
  }

  return prepareBugReportReviewFromAuditCandidatesCompatibility(
    input,
  );
}

/**
 * @deprecated Engine-internal compatibility route.
 * Production map audits must start with runSelectedMapAudit() and continue
 * with buildSelectedMapAuditReport(). Do not construct closure inputs manually.
 */
export function buildBugReportFromAuditCandidatesCompatibility(
  input: BuildBugReportFromAuditInput,
): BuildBugReportFromAuditResult {
  const collection = collectConfirmedDefects(
    input.candidates,
    input.engineeringAnalyses ?? [],
  );
  const sourceIssues = sourceEvidenceIssues(
    collection.confirmed,
    input.files,
  );

  if (
    input.approved.map.name !== input.map.name ||
    input.approved.map.mapVersion !== input.map.mapVersion
  ) {
    return {
      collection,
      promotion: {
        ok: false,
        issues: [{
          code: "invalid-confirmed-defect",
          message:
            "Approved Bug Set does not match the audited map/version.",
        }],
      },
    };
  }

  return {
    collection,
    promotion:
      sourceIssues.length > 0
        ? {
            ok: false,
            issues: sourceIssues,
          }
        : buildBugReportFromApprovedBugSet({
            approved: input.approved,
            repairBy: input.repairBy,
            defects: collection.confirmed,
            ...(input.groupResolutions === undefined
              ? {}
              : {
                  groupResolutions:
                    input.groupResolutions,
                }),
          }),
  };
}


export function buildBugReportFromAuditCandidates(
  input: BuildBugReportFromClosedAuditInput,
): BuildBugReportFromAuditResult {
  const closureIssues = [
    ...mandatoryAuditProcedurePublicationIssues(
      input.mandatoryAuditProcedure,
    ),
    ...gameplayDiscoveryPublicationIssues(
      input.gameplayDiscoveryClosure,
    ),
    ...gameplayClosurePublicationIssues(
      input.gameplayClosure,
    ),
    ...gameplayScenarioPublicationIssues(
      input.gameplayScenarioClosure,
    ),
    ...gameplayDefectResolutionPublicationIssues(
      input.gameplayDefectResolution,
    ),
    ...gameplayDefectCandidateCoverageIssues(
      input.gameplayDefectResolution,
      input.candidates,
    ),
  ];

  if (closureIssues.length > 0) {
    return {
      collection: collectConfirmedDefects(
        input.candidates,
        input.engineeringAnalyses ?? [],
      ),
      promotion: {
        ok: false,
        issues: closureIssues,
      },
    };
  }

  return buildBugReportFromAuditCandidatesCompatibility(
    input,
  );
}

export const buildBugReportFromClosedAuditCandidates =
  buildBugReportFromAuditCandidates;