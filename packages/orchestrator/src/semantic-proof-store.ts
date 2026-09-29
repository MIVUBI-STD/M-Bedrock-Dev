import {
  mkdir,
  readFile,
} from "node:fs/promises";
import {
  join,
} from "node:path";
import {
  atomicWriteText,
} from "../../repair/src/index.js";
import type {
  ProjectWorkspaceLayout,
} from "../../project-model/src/index.js";
import type {
  SemanticProofClaim,
} from "./semantic-proof-cache.js";

export interface SemanticProofClaimStore {
  schemaVersion: 1;
  claims:
    readonly SemanticProofClaim[];
}

function pathFor(
  workspace:
    ProjectWorkspaceLayout,
): string {
  return join(
    workspace.state,
    "semantic-proofs.json",
  );
}

function validateClaim(
  value: unknown,
): SemanticProofClaim {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    throw new Error(
      "Semantic proof claim must be an object.",
    );
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  if (
    record.schemaVersion !== 1 ||
    typeof record.claimId !==
      "string" ||
    !record.claimId.trim() ||
    typeof record.claimRevision !==
      "string" ||
    !record.claimRevision.trim() ||
    ![
      "static",
      "semantic",
      "formal",
      "runtime",
      "validation",
    ].includes(
      String(record.kind),
    ) ||
    !Array.isArray(
      record.basisNodeIds,
    ) ||
    record.basisNodeIds.length ===
      0 ||
    !record.basisNodeIds.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0,
    ) ||
    typeof record
      .basisFingerprint !==
      "string" ||
    !record
      .basisFingerprint
      .trim() ||
    !Array.isArray(
      record.evidenceIds,
    ) ||
    record.evidenceIds.length ===
      0 ||
    !record.evidenceIds.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0,
    ) ||
    (
      record
        .targetProfileFingerprint !==
        undefined &&
      (
        typeof record
          .targetProfileFingerprint !==
          "string" ||
        !record
          .targetProfileFingerprint
          .trim()
      )
    )
  ) {
    throw new Error(
      "Semantic proof claim is structurally invalid.",
    );
  }

  return record as unknown as
    SemanticProofClaim;
}

export function parseSemanticProofClaimStore(
  value: unknown,
): SemanticProofClaimStore {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    throw new Error(
      "Semantic proof claim store must be an object.",
    );
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  if (
    record.schemaVersion !== 1 ||
    !Array.isArray(
      record.claims,
    )
  ) {
    throw new Error(
      "Semantic proof claim store is structurally invalid.",
    );
  }

  const claims =
    record.claims.map(
      validateClaim,
    );
  const ids =
    new Set<string>();

  for (const claim of claims) {
    if (ids.has(claim.claimId)) {
      throw new Error(
        "Duplicate semantic proof claim id: " +
          claim.claimId +
          ".",
      );
    }
    ids.add(claim.claimId);
  }

  return {
    schemaVersion: 1,
    claims:
      [...claims].sort(
        (a, b) =>
          a.claimId.localeCompare(
            b.claimId,
          ),
      ),
  };
}

export async function loadSemanticProofClaimStore(
  workspace:
    ProjectWorkspaceLayout,
): Promise<
  SemanticProofClaimStore
> {
  try {
    const text =
      await readFile(
        pathFor(workspace),
        "utf8",
      );
    return parseSemanticProofClaimStore(
      JSON.parse(text),
    );
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? String(
            (
              error as {
                code?: unknown;
              }
            ).code,
          )
        : undefined;

    if (code === "ENOENT") {
      return {
        schemaVersion: 1,
        claims: [],
      };
    }

    throw error;
  }
}

export async function saveSemanticProofClaimStore(
  workspace:
    ProjectWorkspaceLayout,
  store:
    SemanticProofClaimStore,
): Promise<void> {
  const parsed =
    parseSemanticProofClaimStore(
      store,
    );

  await mkdir(
    workspace.state,
    { recursive: true },
  );
  await atomicWriteText(
    pathFor(workspace),
    JSON.stringify(
      parsed,
      null,
      2,
    ) + "\n",
  );
}

export async function upsertSemanticProofClaim(
  workspace:
    ProjectWorkspaceLayout,
  claim:
    SemanticProofClaim,
): Promise<
  SemanticProofClaimStore
> {
  const current =
    await loadSemanticProofClaimStore(
      workspace,
    );
  const next:
    SemanticProofClaimStore = {
    schemaVersion: 1,
    claims: [
      ...current.claims.filter(
        (item) =>
          item.claimId !==
          claim.claimId,
      ),
      validateClaim(claim),
    ].sort((a, b) =>
      a.claimId.localeCompare(
        b.claimId,
      )
    ),
  };

  await saveSemanticProofClaimStore(
    workspace,
    next,
  );

  return next;
}
