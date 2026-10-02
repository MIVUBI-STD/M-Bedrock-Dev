import type {
  GameplayIntentModel,
} from "./types.js";

export interface GameplayStateClosureRecord {
  readonly subjectId: string;
  readonly kind: "phase" | "state" | "lifecycle";
  readonly hasEntry: boolean;
  readonly hasExit: boolean;
  readonly unknown: boolean;
  readonly status:
    | "closed"
    | "partial"
    | "open";
  readonly reasons: readonly string[];
}

export interface GameplayStateClosureResult {
  readonly complete: boolean;
  readonly records:
    readonly GameplayStateClosureRecord[];
  readonly openSubjectIds: readonly string[];
  readonly partialSubjectIds: readonly string[];
}

const ENTRY_KINDS = new Set([
  "transitions-to",
  "recovers-to",
  "produces",
  "participates-in",
] as const);

const EXIT_KINDS = new Set([
  "transitions-to",
  "recovers-to",
  "wins-by",
  "loses-by",
  "produces",
] as const);

export function assessGameplayStateClosure(
  model: GameplayIntentModel,
): GameplayStateClosureResult {
  const stateNodes = model.nodes.filter(
    (
      node,
    ): node is typeof node & {
      kind: "phase" | "state" | "lifecycle";
    } =>
      node.kind === "phase" ||
      node.kind === "state" ||
      node.kind === "lifecycle",
  );

  const unknownSubjects = new Set(
    model.unknowns.flatMap(
      (unknown) =>
        unknown.blockedSubjectIds,
    ),
  );

  const incomingCount = new Map<string, number>();
  const outgoingCount = new Map<string, number>();
  for (const edge of model.edges) {
    incomingCount.set(
      edge.to,
      (incomingCount.get(edge.to) ?? 0) + 1,
    );
    outgoingCount.set(
      edge.from,
      (outgoingCount.get(edge.from) ?? 0) + 1,
    );
  }
  const rootCandidates = stateNodes.filter(
    (node) =>
      (incomingCount.get(node.id) ?? 0) === 0 &&
      (outgoingCount.get(node.id) ?? 0) > 0,
  );
  const rootIds = new Set(
    rootCandidates.length === 1
      ? [rootCandidates[0]!.id]
      : [],
  );
  const terminalPattern =
    /(?:victory|defeat|complete|completed|finish|finished|result|end|ended|cleanup|lobby-return|game-over)/i;

  const records =
    stateNodes.map((node) => {
      const incoming = model.edges.filter(
        (edge) =>
          edge.to === node.id &&
          ENTRY_KINDS.has(
            edge.kind as
              | "transitions-to"
              | "recovers-to"
              | "produces"
              | "participates-in",
          ),
      );
      const outgoing = model.edges.filter(
        (edge) =>
          edge.from === node.id &&
          EXIT_KINDS.has(
            edge.kind as
              | "transitions-to"
              | "recovers-to"
              | "wins-by"
              | "loses-by"
              | "produces",
          ),
      );

      const hasEntry =
        incoming.length > 0 ||
        rootIds.has(node.id);
      const hasExit =
        outgoing.length > 0 ||
        (
          terminalPattern.test(node.id) ||
          terminalPattern.test(node.label)
        );
      const unknown =
        unknownSubjects.has(node.id) ||
        node.status === "hypothesis";
      const reasons: string[] = [];

      if (!hasEntry) {
        reasons.push(
          "No grounded entry path is modeled for this gameplay state, and it is not the unique initial state.",
        );
      }
      if (!hasExit) {
        reasons.push(
          "No grounded exit/terminal path is modeled for this gameplay state.",
        );
      }
      if (unknown) {
        reasons.push(
          "Gameplay intent for this state is unresolved.",
        );
      }

      const status:
        GameplayStateClosureRecord["status"] =
          !hasEntry && !hasExit
            ? "open"
            : !hasEntry ||
              !hasExit ||
              unknown
              ? "partial"
              : "closed";

      return {
        subjectId: node.id,
        kind: node.kind,
        hasEntry,
        hasExit,
        unknown,
        status,
        reasons,
      };
    });

  return {
    complete:
      records.length > 0 &&
      records.every(
        (record) =>
          record.status === "closed",
      ),
    records,
    openSubjectIds: records
      .filter(
        (record) =>
          record.status === "open",
      )
      .map((record) => record.subjectId)
      .sort(),
    partialSubjectIds: records
      .filter(
        (record) =>
          record.status === "partial",
      )
      .map((record) => record.subjectId)
      .sort(),
  };
}
