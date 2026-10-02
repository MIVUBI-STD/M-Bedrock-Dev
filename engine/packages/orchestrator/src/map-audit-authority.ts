const AUDIT_AUTHORITY_BRAND =
  Symbol("selected-map-audit-authority");

export interface SelectedMapAuditAuthority {
  readonly policy: "selected-map-audit-authority";
  readonly auditRevision: string;
  readonly artifactFingerprint: string;
  readonly [AUDIT_AUTHORITY_BRAND]: true;
}

export function issueSelectedMapAuditAuthority(input: {
  readonly auditRevision: string;
  readonly artifactFingerprint: string;
}): SelectedMapAuditAuthority {
  if (
    !input.auditRevision.trim() ||
    !input.artifactFingerprint.trim()
  ) {
    throw new Error(
      "Selected-map audit authority requires auditRevision and artifactFingerprint.",
    );
  }
  return {
    policy: "selected-map-audit-authority",
    auditRevision: input.auditRevision,
    artifactFingerprint: input.artifactFingerprint,
    [AUDIT_AUTHORITY_BRAND]: true,
  };
}

export function selectedMapAuditAuthorityIssues(
  authority: SelectedMapAuditAuthority | undefined,
  expected: {
    readonly auditRevision?: string;
    readonly artifactFingerprint?: string;
  } = {},
): readonly string[] {
  if (
    authority === undefined ||
    authority.policy !== "selected-map-audit-authority" ||
    authority[AUDIT_AUTHORITY_BRAND] !== true
  ) {
    return [
      "Production reporting requires authority issued by the canonical SelectedMapAuditRun pipeline.",
    ];
  }
  const issues: string[] = [];
  if (
    expected.auditRevision !== undefined &&
    authority.auditRevision !== expected.auditRevision
  ) {
    issues.push(
      "Selected-map audit authority revision does not match the current audit snapshot.",
    );
  }
  if (
    expected.artifactFingerprint !== undefined &&
    authority.artifactFingerprint !== expected.artifactFingerprint
  ) {
    issues.push(
      "Selected-map audit authority fingerprint does not match the selected artifact.",
    );
  }
  return issues;
}
