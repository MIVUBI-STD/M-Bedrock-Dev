import type {
  MinecraftSemanticClaimRevision,
  MinecraftSemanticRuntimeClass,
  SemanticClaimDisposition,
} from "../../behavior-model/src/index.js";
import {
  evaluateKnowledgeApplicabilityV2,
  validateKnowledgeClaimV2,
  type KnowledgeClaimV2,
} from "../../knowledge/src/index.js";
import {
  runtimeProfileFingerprint,
  type MinecraftRuntimeProfile,
} from "../../runtime-profile/src/index.js";

export interface KnowledgeSemanticBinding {
  knowledgeClaimId: string;
  semanticClaimId: string;
  disposition: SemanticClaimDisposition;
}

export interface KnowledgeSemanticBindingResult {
  revision?: MinecraftSemanticClaimRevision;
  applicability:
    | "applies"
    | "does-not-apply"
    | "unknown"
    | "invalid";
  reasons: readonly string[];
}

export function semanticRuntimeClassFromProfile(
  profile: MinecraftRuntimeProfile,
): MinecraftSemanticRuntimeClass | undefined {
  if (
    profile.product.edition === "education"
  ) {
    return profile.host === "education-host"
      ? "education-host"
      : undefined;
  }

  if (profile.host === "editor") {
    return "editor";
  }

  if (
    profile.product.edition ===
      "bedrock-preview"
  ) {
    return profile.host === "client"
      ? "bedrock-preview-client"
      : undefined;
  }

  switch (profile.host) {
    case "client":
      return "bedrock-retail-client";
    case "listen-server":
      return "bedrock-listen-server";
    case "dedicated-server":
      return "bedrock-dedicated-server";
    case "realm":
      return "bedrock-realm";
    default:
      return undefined;
  }
}

function provenanceForKnowledgeClaim(
  claim: KnowledgeClaimV2,
) {
  const evidenceIds = claim.evidence
    .map((item) => item.id)
    .sort();

  switch (claim.classification) {
    case "documented-contract":
      return {
        kind: "official-knowledge" as const,
        evidenceCeiling: "documented" as const,
        evidenceIds,
      };
    case "observed-behavior":
      return {
        kind: "runtime-evidence" as const,
        evidenceCeiling: "observed" as const,
        evidenceIds,
      };
    case "project-policy":
      return {
        kind: "project-policy" as const,
        evidenceCeiling: "designed" as const,
        evidenceIds,
      };
    case "derived-rule":
    case "hypothesis":
      return {
        kind: "source-inference" as const,
        evidenceCeiling: "inferred" as const,
        evidenceIds,
      };
  }
}

export function semanticRevisionFromKnowledgeClaim(
  claim: KnowledgeClaimV2,
  binding: KnowledgeSemanticBinding,
  profile: MinecraftRuntimeProfile,
): KnowledgeSemanticBindingResult {
  const validationErrors =
    validateKnowledgeClaimV2(claim);

  if (validationErrors.length > 0) {
    return {
      applicability: "invalid",
      reasons: validationErrors,
    };
  }

  if (
    binding.knowledgeClaimId !== claim.id
  ) {
    return {
      applicability: "invalid",
      reasons: [
        "Semantic binding references a different knowledge claim id.",
      ],
    };
  }

  const runtimeClass =
    semanticRuntimeClassFromProfile(profile);
  if (!runtimeClass) {
    return {
      applicability: "unknown",
      reasons: [
        "Target runtime profile cannot be mapped safely to a semantic runtime class.",
      ],
    };
  }

  const applicability =
    evaluateKnowledgeApplicabilityV2(
      claim.applicability,
      profile,
    );

  if (applicability.state !== "applies") {
    return {
      applicability: applicability.state,
      reasons: applicability.reasons,
    };
  }

  if (
    claim.lifecycle === "deprecated" ||
    claim.lifecycle === "superseded"
  ) {
    return {
      applicability: "does-not-apply",
      reasons: [
        "Deprecated or superseded knowledge claims cannot create active semantic revisions.",
      ],
    };
  }

  if (claim.certainty === "conflicting") {
    return {
      applicability: "unknown",
      reasons: [
        "Conflicting knowledge claims must be reconciled before semantic binding.",
      ],
    };
  }

  const targetFingerprint =
    runtimeProfileFingerprint(profile);

  return {
    applicability: "applies",
    reasons: [
      "Knowledge claim applicability matches the exact target runtime profile.",
    ],
    revision: {
      id:
        "semantic-from-knowledge:" +
        claim.id +
        ":" +
        targetFingerprint,
      claimId: binding.semanticClaimId,
      runtimeClass,
      minecraftVersion:
        profile.product.version,
      revision:
        claim.lifecycle +
        ":" +
        claim.certainty +
        ":" +
        targetFingerprint,
      statement:
        claim.description ??
        (
          claim.subject.id +
          " " +
          claim.predicate +
          " " +
          JSON.stringify(claim.object)
        ),
      disposition: binding.disposition,
      provenance:
        provenanceForKnowledgeClaim(claim),
      ...(claim.supersedes === undefined
        ? {}
        : {
            supersedesRevisionIds:
              claim.supersedes,
          }),
    },
  };
}
