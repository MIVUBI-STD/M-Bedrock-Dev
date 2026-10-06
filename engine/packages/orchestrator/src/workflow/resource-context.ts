import type {
  RetrievalResult,
  SectionRetrievalResult,
} from "../../../analysis-planner/src/index.js";

export interface CompiledResourceContextItem {
  readonly id: string;
  readonly class: string;
  readonly domain: string;
  readonly role?: string;
  readonly authority: string;
  readonly path: string;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface CompiledResourceContext {
  readonly items: readonly CompiledResourceContextItem[];
  readonly omitted: number;
}

function positiveMaximum(value: number | undefined): number {
  if (value === undefined) return 12;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Resource Context maximum must be a positive integer.");
  }
  return Math.min(value, 50);
}

export function compileResourceContext(
  selection: readonly RetrievalResult[] | undefined,
  maximum?: number,
): CompiledResourceContext | undefined {
  if (selection === undefined) return undefined;

  const limit = positiveMaximum(maximum);
  const items = selection.slice(0, limit).map((result) => ({
    id: result.resource.id,
    class: result.resource.class,
    domain: result.resource.domain,
    ...(result.resource.role === undefined
      ? {}
      : { role: result.resource.role }),
    authority: result.resource.authority,
    path: result.resource.path,
    score: result.score.total,
    reasons: [...result.reasons],
  }));

  return {
    items,
    omitted: Math.max(0, selection.length - items.length),
  };
}

export interface CompiledSectionContextItem {
  readonly id: string;
  readonly documentId: string;
  readonly path: string;
  readonly heading: string;
  readonly anchor: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface CompiledSectionContext {
  readonly items: readonly CompiledSectionContextItem[];
  readonly omitted: number;
}

export function compileSectionContext(
  selection: readonly SectionRetrievalResult[] | undefined,
  maximum?: number,
): CompiledSectionContext | undefined {
  if (selection === undefined) return undefined;

  const limit = positiveMaximum(maximum);
  const items = selection.slice(0, limit).map((result) => ({
    id: result.section.id,
    documentId: result.section.documentId,
    path: result.section.path,
    heading: result.section.heading,
    anchor: result.section.anchor,
    startLine: result.section.startLine,
    endLine: result.section.endLine,
    score: result.score.total,
    reasons: [...result.reasons],
  }));

  return {
    items,
    omitted: Math.max(0, selection.length - items.length),
  };
}
