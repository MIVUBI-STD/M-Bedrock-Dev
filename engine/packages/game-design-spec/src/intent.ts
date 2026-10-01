import type {
  GameDesignIntentRule,
  GameDesignIntentScope,
  GameDesignSourceKind,
  GameDesignSpec,
  IntentAuthorityStrength,
} from "./types.js";

export interface GameDesignIntentContext {
  readonly modeId?: string;
  readonly phase?: string;
  readonly actorType?: "player" | "entity" | "system";
  readonly stateTags?: readonly string[];
}

export interface ResolvedGameDesignIntentRule {
  readonly designId: string;
  readonly sourceReference: string;
  readonly rule: GameDesignIntentRule;
  readonly authority: IntentAuthorityStrength;
  readonly exceptionId?: string;
}

function containsAll(
  actual: readonly string[],
  required: readonly string[] | undefined,
): boolean {
  if (!required || required.length === 0) return true;
  const values = new Set(actual);
  return required.every((item) => values.has(item));
}

function scopeMatches(
  scope: GameDesignIntentScope | undefined,
  context: GameDesignIntentContext,
): boolean {
  if (!scope) return true;
  if (
    scope.modes?.length &&
    (!context.modeId || !scope.modes.includes(context.modeId))
  ) {
    return false;
  }
  if (
    scope.phases?.length &&
    (!context.phase || !scope.phases.includes(context.phase))
  ) {
    return false;
  }
  if (
    scope.actorTypes?.length &&
    (!context.actorType || !scope.actorTypes.includes(context.actorType))
  ) {
    return false;
  }
  return containsAll(
    context.stateTags ?? [],
    scope.stateTags,
  );
}

export function intentAuthorityStrength(
  design: Pick<GameDesignSpec, "status" | "source">,
): IntentAuthorityStrength {
  if (design.status !== "approved") return "unknown";

  const kind: GameDesignSourceKind = design.source.kind;
  if (kind === "authored-spec" || kind === "client-brief") {
    return "authoritative";
  }
  if (kind === "approved-reconstruction") {
    return "strong";
  }
  return "unknown";
}

export function resolveGameDesignIntentRules(
  design: GameDesignSpec,
  context: GameDesignIntentContext,
  subjectIds: readonly string[] = [],
): readonly ResolvedGameDesignIntentRule[] {
  const subjects = new Set(subjectIds);

  return (design.intentRules ?? [])
    .filter((rule) => {
      const subjectMatch =
        !rule.subjectIds?.length ||
        rule.subjectIds.some((id) => subjects.has(id));
      return subjectMatch &&
        scopeMatches(rule.appliesWhen, context);
    })
    .map((rule) => {
      const exception = (rule.exceptions ?? []).find(
        (item) =>
          containsAll(
            context.stateTags ?? [],
            item.stateTags,
          ),
      );
      return {
        designId: design.id,
        sourceReference: design.source.reference,
        rule,
        authority: intentAuthorityStrength(design),
        ...(exception === undefined
          ? {}
          : { exceptionId: exception.id }),
      };
    })
    .sort((a, b) =>
      a.rule.id.localeCompare(b.rule.id)
    );
}
