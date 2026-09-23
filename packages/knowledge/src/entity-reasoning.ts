import type {
  EffectiveKnowledgeProfile,
  KnowledgeCatalog,
  KnowledgeRelation,
} from "./types.js";
import { effectiveRelations } from "./effective.js";

export interface EntityKnowledgeState {
  activeComponents: readonly string[];
  availableCapabilities?: readonly string[];
}

export interface EntityKnowledgeFinding {
  relationId: string;
  subject: string;
  requirement: string;
  message: string;
  severity: "info" | "warning";
}

function requirementsFor(
  relations: readonly KnowledgeRelation[],
  subject: string,
): KnowledgeRelation[] {
  return relations.filter((relation) =>
    relation.subject === subject &&
    (relation.kind === "requires" || relation.kind === "requires-any")
  );
}

export function assessEntityKnowledge(
  catalog: KnowledgeCatalog,
  profile: EffectiveKnowledgeProfile,
  state: EntityKnowledgeState,
): EntityKnowledgeFinding[] {
  const active = new Set(state.activeComponents);
  const capabilities = new Set(state.availableCapabilities ?? []);
  const relations = effectiveRelations(catalog, profile);
  const findings: EntityKnowledgeFinding[] = [];

  for (const subject of active) {
    for (const relation of requirementsFor(relations, subject)) {
      if (relation.kind === "requires") {
        if (!active.has(relation.object) && !capabilities.has(relation.object)) {
          findings.push({
            relationId: relation.id,
            subject,
            requirement: relation.object,
            severity: "warning",
            message: relation.diagnosticHint ??
              `${subject} requires ${relation.object} according to knowledge catalog.`,
          });
        }
        continue;
      }

      const alternatives = relation.object
        .split("|")
        .map((value) => value.trim())
        .filter(Boolean);
      if (!alternatives.some((value) => active.has(value) || capabilities.has(value))) {
        findings.push({
          relationId: relation.id,
          subject,
          requirement: relation.object,
          severity: "warning",
          message: relation.diagnosticHint ??
            `${subject} requires at least one of: ${alternatives.join(", ")}.`,
        });
      }
    }
  }

  return findings.sort((a, b) =>
    a.subject.localeCompare(b.subject) ||
    a.relationId.localeCompare(b.relationId)
  );
}
