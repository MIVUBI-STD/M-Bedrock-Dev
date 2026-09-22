export interface SelectorScoresFilter {
  objective: string;
  range: string;
}

export interface SelectorTagFilter {
  tag: string;
  negated: boolean;
}

export interface ParsedSelector {
  raw: string;
  base: "@a" | "@e" | "@p" | "@r" | "@s";
  arguments: Readonly<Record<string, string[]>>;
  scores: SelectorScoresFilter[];
  tags: SelectorTagFilter[];
}

export function parseSelector(token: string): ParsedSelector | undefined {
  const match = /^(@[aeprs])(?:\[(.*)\])?$/.exec(token.trim());
  if (!match) return undefined;

  const base = match[1] as ParsedSelector["base"];
  const body = match[2];
  const argumentsMap: Record<string, string[]> = {};
  const scores: SelectorScoresFilter[] = [];
  const tags: SelectorTagFilter[] = [];

  if (body) {
    const parts: string[] = [];
    let depth = 0;
    let current = "";

    for (const char of body) {
      if (char === "{" || char === "[") depth += 1;
      if (char === "}" || char === "]") depth -= 1;

      if (char === "," && depth === 0) {
        parts.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    if (current) parts.push(current);

    for (const part of parts) {
      const split = part.indexOf("=");
      if (split < 0) continue;
      const key = part.slice(0, split).trim();
      const value = part.slice(split + 1).trim();
      (argumentsMap[key] ??= []).push(value);

      if (key === "scores" && value.startsWith("{") && value.endsWith("}")) {
        const scoreBody = value.slice(1, -1);
        for (const entry of scoreBody.split(",")) {
          const eq = entry.indexOf("=");
          if (eq < 0) continue;
          const objective = entry.slice(0, eq).trim();
          const range = entry.slice(eq + 1).trim();
          if (objective) scores.push({ objective, range });
        }
      }

      if (key === "tag") {
        const negated = value.startsWith("!");
        const tag = negated ? value.slice(1) : value;
        if (tag) tags.push({ tag, negated });
      }
    }
  }

  return {
    raw: token,
    base,
    arguments: argumentsMap,
    scores,
    tags,
  };
}
