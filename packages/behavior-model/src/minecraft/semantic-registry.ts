import type {
  BehaviorClaimProvenance,
} from "../provenance.js";
import type {
  MinecraftSemanticRuntimeClass,
  SemanticClaimDisposition,
} from "./runtime-overlay.js";

export interface MinecraftSemanticClaimRevision {
  id: string;
  claimId: string;
  runtimeClass: MinecraftSemanticRuntimeClass;
  minecraftVersion?: string;
  revision: string;
  statement: string;
  disposition: SemanticClaimDisposition;
  provenance: BehaviorClaimProvenance;
  supersedesRevisionIds?: readonly string[];
}

export interface MinecraftSemanticClaimRegistry {
  schemaVersion: 1;
  revision: string;
  entries: readonly MinecraftSemanticClaimRevision[];
}

export interface MinecraftSemanticClaimQuery {
  claimId: string;
  runtimeClass: MinecraftSemanticRuntimeClass;
  minecraftVersion?: string;
}

export interface SemanticClaimConflict {
  claimId: string;
  runtimeClass: MinecraftSemanticRuntimeClass;
  minecraftVersion?: string;
  entryIds: readonly string[];
  dispositions: readonly SemanticClaimDisposition[];
  evidenceKinds: readonly BehaviorClaimProvenance["kind"][];
  reason: string;
}

export interface SemanticClaimResolution {
  query: MinecraftSemanticClaimQuery;
  entries: readonly MinecraftSemanticClaimRevision[];
  conflict?: SemanticClaimConflict;
  resolved?: MinecraftSemanticClaimRevision;
  reasons: readonly string[];
}

function scopeKey(
  entry: Pick<
    MinecraftSemanticClaimRevision,
    "claimId" | "runtimeClass" | "minecraftVersion"
  >,
): string {
  return [
    entry.claimId,
    entry.runtimeClass,
    entry.minecraftVersion ?? "*",
  ].join("|");
}

function activeEntries(
  entries: readonly MinecraftSemanticClaimRevision[],
): MinecraftSemanticClaimRevision[] {
  const superseded = new Set(
    entries.flatMap(
      (entry) =>
        entry.supersedesRevisionIds ?? [],
    ),
  );
  return entries.filter(
    (entry) => !superseded.has(entry.id),
  );
}

export function validateMinecraftSemanticClaimRegistry(
  registry: MinecraftSemanticClaimRegistry,
): string[] {
  const errors: string[] = [];

  if (registry.schemaVersion !== 1) {
    errors.push(
      "Minecraft semantic claim registry schemaVersion must be 1.",
    );
  }
  if (!registry.revision.trim()) {
    errors.push(
      "Minecraft semantic claim registry revision must be non-empty.",
    );
  }

  const ids = new Set<string>();
  for (const entry of registry.entries) {
    if (!entry.id.trim()) {
      errors.push(
        "Semantic claim revision id must be non-empty.",
      );
    }
    if (ids.has(entry.id)) {
      errors.push(
        "Duplicate semantic claim revision id: " +
          entry.id +
          ".",
      );
    }
    ids.add(entry.id);

    if (!entry.claimId.trim()) {
      errors.push(
        "Semantic claim revision claimId must be non-empty: " +
          entry.id +
          ".",
      );
    }
    if (!entry.revision.trim()) {
      errors.push(
        "Semantic claim revision must be non-empty: " +
          entry.id +
          ".",
      );
    }
    if (!entry.statement.trim()) {
      errors.push(
        "Semantic claim revision statement must be non-empty: " +
          entry.id +
          ".",
      );
    }
    if (
      entry.minecraftVersion !== undefined &&
      !/^\d+(?:\.\d+)+$/.test(
        entry.minecraftVersion,
      )
    ) {
      errors.push(
        "Semantic claim minecraftVersion must be dotted numeric when provided: " +
          entry.id +
          ".",
      );
    }
    if (
      entry.provenance.evidenceIds.length === 0
    ) {
      errors.push(
        "Semantic claim revision requires evidence identity: " +
          entry.id +
          ".",
      );
    }
  }

  for (const entry of registry.entries) {
    for (
      const superseded of
        entry.supersedesRevisionIds ?? []
    ) {
      if (!ids.has(superseded)) {
        errors.push(
          "Semantic claim revision " +
            entry.id +
            " supersedes unknown revision " +
            superseded +
            ".",
        );
      }
      if (superseded === entry.id) {
        errors.push(
          "Semantic claim revision cannot supersede itself: " +
            entry.id +
            ".",
        );
      }
    }
  }

  return errors;
}

export function semanticClaimConflicts(
  registry: MinecraftSemanticClaimRegistry,
): SemanticClaimConflict[] {
  const groups = new Map<
    string,
    MinecraftSemanticClaimRevision[]
  >();

  for (
    const entry of activeEntries(
      registry.entries,
    )
  ) {
    const key = scopeKey(entry);
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }

  const conflicts: SemanticClaimConflict[] = [];

  for (const entries of groups.values()) {
    const dispositions = new Set(
      entries
        .map((entry) => entry.disposition)
        .filter(
          (value) => value !== "unknown",
        ),
    );

    if (dispositions.size <= 1) continue;

    const first = entries[0]!;
    conflicts.push({
      claimId: first.claimId,
      runtimeClass:
        first.runtimeClass,
      ...(first.minecraftVersion === undefined
        ? {}
        : {
            minecraftVersion:
              first.minecraftVersion,
          }),
      entryIds: entries
        .map((entry) => entry.id)
        .sort(),
      dispositions: [
        ...dispositions,
      ].sort(),
      evidenceKinds: [
        ...new Set(
          entries.map(
            (entry) =>
              entry.provenance.kind,
          ),
        ),
      ].sort(),
      reason:
        "Active semantic claim revisions disagree on disposition within the same runtime/version scope.",
    });
  }

  return conflicts.sort(
    (left, right) =>
      left.claimId.localeCompare(
        right.claimId,
      ) ||
      left.runtimeClass.localeCompare(
        right.runtimeClass,
      ),
  );
}

export function resolveMinecraftSemanticClaimRevision(
  registry: MinecraftSemanticClaimRegistry,
  query: MinecraftSemanticClaimQuery,
): SemanticClaimResolution {
  const validationErrors =
    validateMinecraftSemanticClaimRegistry(
      registry,
    );
  if (validationErrors.length > 0) {
    return {
      query,
      entries: [],
      reasons: validationErrors,
    };
  }

  const candidates = activeEntries(
    registry.entries,
  ).filter(
    (entry) =>
      entry.claimId === query.claimId &&
      entry.runtimeClass ===
        query.runtimeClass &&
      (
        entry.minecraftVersion ===
          query.minecraftVersion ||
        (
          query.minecraftVersion !==
            undefined &&
          entry.minecraftVersion ===
            undefined
        )
      ),
  );

  const exact = candidates.filter(
    (entry) =>
      entry.minecraftVersion ===
        query.minecraftVersion,
  );
  const chosenScope =
    exact.length > 0 ? exact : candidates;

  if (chosenScope.length === 0) {
    return {
      query,
      entries: [],
      reasons: [
        "No active semantic claim revision matches the requested runtime/version scope.",
      ],
    };
  }

  const dispositions = new Set(
    chosenScope
      .map((entry) => entry.disposition)
      .filter(
        (value) => value !== "unknown",
      ),
  );

  if (dispositions.size > 1) {
    const first = chosenScope[0]!;
    return {
      query,
      entries: chosenScope,
      conflict: {
        claimId: query.claimId,
        runtimeClass:
          query.runtimeClass,
        ...(first.minecraftVersion === undefined
          ? {}
          : {
              minecraftVersion:
                first.minecraftVersion,
            }),
        entryIds: chosenScope
          .map((entry) => entry.id)
          .sort(),
        dispositions: [
          ...dispositions,
        ].sort(),
        evidenceKinds: [
          ...new Set(
            chosenScope.map(
              (entry) =>
                entry.provenance.kind,
            ),
          ),
        ].sort(),
        reason:
          "Matching active semantic claim revisions conflict; automatic resolution is forbidden.",
      },
      reasons: [
        "Semantic claim conflict blocks automatic resolution.",
      ],
    };
  }

  if (chosenScope.length > 1) {
    return {
      query,
      entries: chosenScope,
      reasons: [
        "Multiple non-conflicting active revisions match; explicit supersession is required before selecting one revision.",
      ],
    };
  }

  const resolved = chosenScope[0]!;

  return {
    query,
    entries: chosenScope,
    resolved,
    reasons: [
      "Exactly one active semantic claim revision matches the requested scope.",
    ],
  };
}
