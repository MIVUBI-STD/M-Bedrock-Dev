export function tokenizeCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | undefined;
  let bracketDepth = 0;

  const push = () => {
    if (current.length > 0) tokens.push(current);
    current = "";
  };

  for (let i = 0; i < command.length; i += 1) {
    const char = command[i]!;

    if (quote) {
      current += char;
      if (char === quote && command[i - 1] !== "\\") quote = undefined;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "[" || char === "{") bracketDepth += 1;
    if (char === "]" || char === "}") bracketDepth = Math.max(0, bracketDepth - 1);

    if (/\s/.test(char) && bracketDepth === 0) {
      push();
      continue;
    }

    current += char;
  }

  push();
  return tokens;
}
