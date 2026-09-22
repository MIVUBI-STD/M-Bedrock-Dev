import type { SourceMutation } from "./mutation-types.js";

function unique(mutations: SourceMutation[]): SourceMutation[] {
  const seen = new Set<string>();
  return mutations.filter((mutation) => {
    const key = `${mutation.descriptor.operator}\u0000${mutation.mutated}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mutateScriptEventDrop(source: string): SourceMutation[] {
  const lines = source.split(/\r?\n/);
  const mutations: SourceMutation[] = [];

  lines.forEach((line, index) => {
    if (!/\.(beforeEvents|afterEvents)\.[A-Za-z0-9_]+\.subscribe\s*\(/.test(line)) return;
    const next = [...lines];
    next[index] = `// mutation:event-drop ${line}`;
    mutations.push({
      descriptor: {
        id: `script-event-drop-${index + 1}`,
        operator: "script-event-drop",
        domain: "script-event",
        description: `Disable event subscription on line ${index + 1}.`,
      },
      original: source,
      mutated: next.join("\n"),
    });
  });

  return unique(mutations);
}

export function mutateScriptEventName(source: string): SourceMutation[] {
  const pattern = /\.(beforeEvents|afterEvents)\.([A-Za-z0-9_]+)\.subscribe/g;
  const mutations: SourceMutation[] = [];

  for (const match of source.matchAll(pattern)) {
    const full = match[0];
    const phase = match[1]!;
    const event = match[2]!;
    const replacement = `.${phase}.__mutation_missing__${event}.subscribe`;
    const index = match.index ?? 0;
    mutations.push({
      descriptor: {
        id: `script-event-rename-${index}`,
        operator: "script-event-rename",
        domain: "script-event",
        description: `Redirect event subscription ${event} to a non-canonical event.`,
      },
      original: source,
      mutated: source.slice(0, index) + replacement + source.slice(index + full.length),
    });
  }

  return unique(mutations);
}

export function mutateScriptEventDuplicate(source: string): SourceMutation[] {
  const lines = source.split(/\r?\n/);
  const mutations: SourceMutation[] = [];

  lines.forEach((line, index) => {
    if (!/\.(beforeEvents|afterEvents)\.[A-Za-z0-9_]+\.subscribe\s*\(/.test(line)) return;
    const next = [...lines];
    next.splice(index + 1, 0, line);
    mutations.push({
      descriptor: {
        id: `script-event-duplicate-${index + 1}`,
        operator: "script-event-duplicate",
        domain: "script-event",
        description: `Duplicate event subscription line ${index + 1}.`,
      },
      original: source,
      mutated: next.join("\n"),
    });
  });

  return unique(mutations);
}

export function mutateDynamicPropertyId(source: string): SourceMutation[] {
  const pattern = /((?:get|set)DynamicProperty\s*\(\s*["'])([^"']+)(["'])/g;
  const mutations: SourceMutation[] = [];

  for (const match of source.matchAll(pattern)) {
    const full = match[0];
    const prefix = match[1]!;
    const id = match[2]!;
    const quote = match[3]!;
    const index = match.index ?? 0;
    const replacement = `${prefix}__mutation_missing__${id}${quote}`;
    mutations.push({
      descriptor: {
        id: `dynamic-property-id-${index}`,
        operator: "dynamic-property-id-substitution",
        domain: "script-dynamic-property",
        description: `Substitute dynamic property id ${id}.`,
      },
      original: source,
      mutated: source.slice(0, index) + replacement + source.slice(index + full.length),
    });
  }

  return unique(mutations);
}

export function mutateScriptSource(source: string): SourceMutation[] {
  return unique([
    ...mutateScriptEventDrop(source),
    ...mutateScriptEventName(source),
    ...mutateScriptEventDuplicate(source),
    ...mutateDynamicPropertyId(source),
  ]);
}
