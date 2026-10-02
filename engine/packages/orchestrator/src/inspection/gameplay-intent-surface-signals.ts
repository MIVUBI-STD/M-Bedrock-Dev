import {
  extractGameplayIntentSurfaceSignal,
  type GameplayIntentSignal,
} from "../../../../analyzers/gameplay-intent/src/index.js";
import type {
  ParsedDialogueDocument,
} from "../../../../analyzers/dialogue/src/index.js";
import type {
  ParsedEntityDefinition,
} from "../../../../analyzers/entities/src/index.js";

export interface GameplayIntentSurfaceSignalSource {
  readonly functions: readonly {
    readonly identifier: string;
    readonly source: {
      readonly relativePath: string;
    };
  }[];
  readonly dialogues:
    readonly (ParsedDialogueDocument | undefined)[];
  readonly structures: readonly {
    readonly identifier: string;
    readonly node: {
      readonly source?: {
        readonly relativePath: string;
      };
    };
  }[];
  readonly entities: readonly {
    readonly parsed: ParsedEntityDefinition;
  }[];
}

function add(
  output: GameplayIntentSignal[],
  input: Parameters<
    typeof extractGameplayIntentSurfaceSignal
  >[0],
): void {
  const signal =
    extractGameplayIntentSurfaceSignal(input);
  if (signal) output.push(signal);
}

export function deriveGameplayIntentSurfaceSignals(
  source: GameplayIntentSurfaceSignalSource,
): readonly GameplayIntentSignal[] {
  const signals: GameplayIntentSignal[] = [];

  for (const fn of source.functions) {
    add(signals, {
      label: fn.identifier,
      locator: fn.source.relativePath,
      evidenceOrigin: "source-code",
      status: "inferred",
      summary:
        "An authored mcfunction identifier exposes a gameplay-surface candidate; naming alone is not intended-design proof.",
    });
  }

  for (const document of source.dialogues) {
    if (!document) continue;
    for (const scene of document.scenes) {
      add(signals, {
        label: scene.sceneTag,
        locator: document.source.relativePath,
        evidenceOrigin: "dialogue",
        status: "inferred",
        summary:
          "A dialogue scene tag exposes a player-facing gameplay-surface candidate from the selected artifact.",
      });
      for (const item of scene.displayText ?? []) {
        add(signals, {
          label: item.text,
          locator: document.source.relativePath,
          evidenceOrigin: "dialogue",
          status: "inferred",
          summary:
            "Player-facing dialogue copy exposes a gameplay expectation or interaction surface from the selected artifact.",
        });
      }
    }
  }

  for (const structure of source.structures) {
    const locator =
      structure.node.source?.relativePath;
    if (!locator) continue;

    add(signals, {
      label: structure.identifier,
      locator,
      evidenceOrigin: "structure",
      status: "inferred",
      summary:
        "An authored structure identifier exposes a physical/world gameplay-surface candidate.",
    });
  }

  for (const entity of source.entities) {
    const identifier =
      entity.parsed.identifier;
    if (!identifier) continue;

    add(signals, {
      label: identifier,
      locator:
        entity.parsed.source.relativePath,
      evidenceOrigin: "source-code",
      status: "inferred",
      summary:
        "An authored entity identifier exposes an actor/role/mechanic candidate; naming alone is not intended-design proof.",
    });
  }

  const unique = new Map<
    string,
    GameplayIntentSignal
  >();

  for (const signal of signals) {
    const key = [
      signal.subjectKey,
      signal.evidenceOrigin,
      signal.locator,
    ].join("::");
    if (!unique.has(key)) {
      unique.set(key, signal);
    }
  }

  return [...unique.values()].sort(
    (a, b) =>
      a.subjectKey.localeCompare(b.subjectKey) ||
      a.locator.localeCompare(b.locator),
  );
}
