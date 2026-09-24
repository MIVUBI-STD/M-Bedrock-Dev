import { parseScriptFile } from "../../../analyzers/scripts/src/index.js";
import { resolveScriptImports } from "../../../analyzers/scripts/src/index.js";
import type { SourceMutation } from "../../reliability-search/src/index.js";
import type { SourceMutationDetector } from "../../reliability-search/src/index.js";

export interface ScriptMutationFixture {
  identifier: string;
  relativePath: string;
  source: string;
  companionScripts?: readonly {
    identifier: string;
    relativePath: string;
    source: string;
  }[];
  knownDynamicPropertyIds?: readonly string[];
}

function parseFixture(
  identifier: string,
  relativePath: string,
  source: string,
) {
  return parseScriptFile(
    identifier,
    source,
    {
      artifactId: "mutation_fixture",
      relativePath,
    },
  );
}

function eventSignature(parsed: ReturnType<typeof parseScriptFile>): string[] {
  return parsed.events
    .map((event) => `${event.root}.${event.phase}.${event.event}`)
    .sort();
}

function eventCounts(parsed: ReturnType<typeof parseScriptFile>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of eventSignature(parsed)) {
    counts.set(event, (counts.get(event) ?? 0) + 1);
  }
  return counts;
}

function dynamicPropertyIds(parsed: ReturnType<typeof parseScriptFile>): string[] {
  return parsed.dynamicProperties
    .map((item) => item.propertyId)
    .filter((value): value is string => typeof value === "string")
    .sort();
}

export function detectScriptMutation(
  fixture: ScriptMutationFixture,
  mutation: SourceMutation,
) {
  if (mutation.original !== fixture.source) {
    return {
      killed: false,
      invalid: true,
      evidence: "Script mutation original does not match fixture source.",
    };
  }

  const baseline = parseFixture(
    fixture.identifier,
    fixture.relativePath,
    fixture.source,
  );
  const mutated = parseFixture(
    fixture.identifier,
    fixture.relativePath,
    mutation.mutated,
  );

  if (mutation.descriptor.domain === "script-event") {
    const beforeCounts = eventCounts(baseline);
    const afterCounts = eventCounts(mutated);

    for (const [event, count] of beforeCounts) {
      if ((afterCounts.get(event) ?? 0) !== count) {
        return {
          killed: true,
          evidence: `Event graph changed for ${event}: ${count} → ${afterCounts.get(event) ?? 0}.`,
        };
      }
    }

    const newEvents = [...afterCounts.keys()].filter((event) => !beforeCounts.has(event));
    if (newEvents.length > 0) {
      return {
        killed: true,
        evidence: `Event graph introduced unknown subscription(s): ${newEvents.join(", ")}`,
      };
    }
  }

  if (mutation.descriptor.domain === "script-dynamic-property") {
    const known = new Set(
      fixture.knownDynamicPropertyIds ?? dynamicPropertyIds(baseline),
    );
    const introduced = dynamicPropertyIds(mutated)
      .filter((id) => !known.has(id));
    if (introduced.length > 0) {
      return {
        killed: true,
        evidence: `Dynamic-property detector found unknown id(s): ${introduced.join(", ")}`,
      };
    }
  }

  if (fixture.companionScripts) {
    const baselineFiles = [
      baseline,
      ...fixture.companionScripts.map((script) =>
        parseFixture(script.identifier, script.relativePath, script.source),
      ),
    ];
    const mutatedFiles = [
      mutated,
      ...fixture.companionScripts.map((script) =>
        parseFixture(script.identifier, script.relativePath, script.source),
      ),
    ];
    const beforeUnresolved = resolveScriptImports(baselineFiles)
      .filter((item) => item.status === "unresolved")
      .length;
    const afterUnresolved = resolveScriptImports(mutatedFiles)
      .filter((item) => item.status === "unresolved")
      .length;

    if (afterUnresolved > beforeUnresolved) {
      return {
        killed: true,
        evidence: "Script dependency graph introduced a new unresolved relative import.",
      };
    }
  }

  return {
    killed: false,
    evidence: "No configured script/event/property detector distinguished the mutant from baseline.",
  };
}

export function createScriptMutationDetector(
  fixture: ScriptMutationFixture,
): SourceMutationDetector {
  return async (mutation) => detectScriptMutation(fixture, mutation);
}
