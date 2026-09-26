import type {
  BehaviorClaimProvenance,
} from "../provenance.js";

export type MinecraftSemanticRuntimeClass =
  | "bedrock-retail-client"
  | "bedrock-listen-server"
  | "bedrock-dedicated-server"
  | "bedrock-realm"
  | "bedrock-preview-client"
  | "education-host"
  | "editor";

export type SemanticClaimDisposition =
  | "affirmed"
  | "denied"
  | "unknown";

export interface MinecraftSemanticClaim {
  id: string;
  domain: string;
  statement: string;
  disposition: SemanticClaimDisposition;
  provenance: BehaviorClaimProvenance;
}

export interface ExplicitSemanticInheritance {
  fromOverlayId: string;
  claimIds: readonly string[];
}

export interface MinecraftSemanticOverlay {
  schemaVersion: 1;
  id: string;
  runtimeClass: MinecraftSemanticRuntimeClass;
  claims: readonly MinecraftSemanticClaim[];
  inherits?: readonly ExplicitSemanticInheritance[];
}

export interface ResolvedSemanticClaim {
  claimId: string;
  overlayId: string;
  sourceOverlayId: string;
  inherited: boolean;
  claim: MinecraftSemanticClaim;
}

export interface SemanticOverlayResolution {
  resolved?: ResolvedSemanticClaim;
  errors: readonly string[];
}

function overlayById(
  overlays: readonly MinecraftSemanticOverlay[],
): ReadonlyMap<string, MinecraftSemanticOverlay> {
  return new Map(
    overlays.map((overlay) => [
      overlay.id,
      overlay,
    ]),
  );
}

export function validateMinecraftSemanticOverlays(
  overlays: readonly MinecraftSemanticOverlay[],
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const overlay of overlays) {
    if (overlay.schemaVersion !== 1) {
      errors.push(
        "Minecraft semantic overlay schemaVersion must be 1: " +
          overlay.id +
          ".",
      );
    }
    if (!overlay.id.trim()) {
      errors.push(
        "Minecraft semantic overlay id must be non-empty.",
      );
    }
    if (ids.has(overlay.id)) {
      errors.push(
        "Duplicate Minecraft semantic overlay id: " +
          overlay.id +
          ".",
      );
    }
    ids.add(overlay.id);

    const claimIds = new Set<string>();
    for (const claim of overlay.claims) {
      if (!claim.id.trim()) {
        errors.push(
          "Semantic claim id must be non-empty in overlay " +
            overlay.id +
            ".",
        );
      }
      if (claimIds.has(claim.id)) {
        errors.push(
          "Duplicate semantic claim id " +
            claim.id +
            " in overlay " +
            overlay.id +
            ".",
        );
      }
      claimIds.add(claim.id);
      if (!claim.domain.trim()) {
        errors.push(
          "Semantic claim domain must be non-empty: " +
            claim.id +
            ".",
        );
      }
      if (!claim.statement.trim()) {
        errors.push(
          "Semantic claim statement must be non-empty: " +
            claim.id +
            ".",
        );
      }
      if (claim.provenance.evidenceIds.length === 0) {
        errors.push(
          "Semantic claim provenance requires evidence identity: " +
            claim.id +
            ".",
        );
      }
    }
  }

  const byId = overlayById(overlays);
  for (const overlay of overlays) {
    for (const inheritance of overlay.inherits ?? []) {
      if (!byId.has(inheritance.fromOverlayId)) {
        errors.push(
          "Semantic overlay " +
            overlay.id +
            " inherits from unknown overlay " +
            inheritance.fromOverlayId +
            ".",
        );
      }
      if (inheritance.fromOverlayId === overlay.id) {
        errors.push(
          "Semantic overlay cannot inherit from itself: " +
            overlay.id +
            ".",
        );
      }
      if (inheritance.claimIds.length === 0) {
        errors.push(
          "Semantic inheritance must list explicit claimIds: " +
            overlay.id +
            " <- " +
            inheritance.fromOverlayId +
            ".",
        );
      }
    }
  }

  return errors;
}

export function resolveMinecraftSemanticClaim(
  overlayId: string,
  claimId: string,
  overlays: readonly MinecraftSemanticOverlay[],
): SemanticOverlayResolution {
  const validationErrors =
    validateMinecraftSemanticOverlays(overlays);
  if (validationErrors.length > 0) {
    return {
      errors: validationErrors,
    };
  }

  const byId = overlayById(overlays);
  const target = byId.get(overlayId);
  if (!target) {
    return {
      errors: [
        "Unknown semantic overlay: " +
          overlayId +
          ".",
      ],
    };
  }

  const direct = target.claims.find(
    (claim) => claim.id === claimId,
  );
  if (direct) {
    return {
      resolved: {
        claimId,
        overlayId,
        sourceOverlayId: overlayId,
        inherited: false,
        claim: direct,
      },
      errors: [],
    };
  }

  const permittedParents = (
    target.inherits ?? []
  ).filter((inheritance) =>
    inheritance.claimIds.includes(claimId)
  );

  if (permittedParents.length === 0) {
    return {
      errors: [],
    };
  }

  const candidates: ResolvedSemanticClaim[] = [];
  const errors: string[] = [];

  for (const inheritance of permittedParents) {
    const parent = byId.get(
      inheritance.fromOverlayId,
    );
    const parentClaim = parent?.claims.find(
      (claim) => claim.id === claimId,
    );

    if (!parentClaim) {
      errors.push(
        "Overlay " +
          target.id +
          " explicitly inherits missing claim " +
          claimId +
          " from " +
          inheritance.fromOverlayId +
          ".",
      );
      continue;
    }

    candidates.push({
      claimId,
      overlayId,
      sourceOverlayId:
        inheritance.fromOverlayId,
      inherited: true,
      claim: parentClaim,
    });
  }

  if (candidates.length > 1) {
    const signatures = new Set(
      candidates.map((candidate) =>
        JSON.stringify({
          disposition:
            candidate.claim.disposition,
          statement:
            candidate.claim.statement,
        })
      ),
    );

    if (signatures.size > 1) {
      errors.push(
        "Conflicting explicitly inherited semantic claims for " +
          claimId +
          " in overlay " +
          target.id +
          ".",
      );
      return { errors };
    }
  }

  return {
    ...(candidates[0] === undefined
      ? {}
      : { resolved: candidates[0] }),
    errors,
  };
}

export function createEmptyMinecraftSemanticOverlay(
  id: string,
  runtimeClass: MinecraftSemanticRuntimeClass,
): MinecraftSemanticOverlay {
  return {
    schemaVersion: 1,
    id,
    runtimeClass,
    claims: [],
  };
}
