import ts from "typescript";
import type {
  SourceRef,
} from "../../../packages/project-model/src/index.js";

export interface PersistentDataLifecycleEvidence {
  propertyKey: string;
  variable: string;
  reads: number;
  appends: number;
  writes: number;
  clears: number;
  growth: "append-without-clear" | "append-with-clear" | "no-append" | "unknown";
  source: SourceRef;
}

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".ts")) return ts.ScriptKind.TS;
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function nodeSource(
  file: ts.SourceFile,
  node: ts.Node,
  source: SourceRef,
): SourceRef {
  const start = file.getLineAndCharacterOfPosition(node.getStart(file));
  const end = file.getLineAndCharacterOfPosition(node.getEnd());
  return {
    ...source,
    range: {
      lineStart: start.line + 1,
      lineEnd: end.line + 1,
      columnStart: start.character + 1,
      columnEnd: end.character + 1,
    },
  };
}

function dynamicPropertyKey(
  node: ts.Node,
  method: "getDynamicProperty" | "setDynamicProperty",
): string | undefined {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    node.expression.name.text !== method
  ) {
    return undefined;
  }
  const key = node.arguments[0];
  return key && ts.isStringLiteralLike(key) ? key.text : undefined;
}

function containsDynamicPropertyRead(
  node: ts.Node,
): string | undefined {
  let found: string | undefined;
  const visit = (current: ts.Node): void => {
    found ??= dynamicPropertyKey(current, "getDynamicProperty");
    if (!found) ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

function isClearValue(
  expression: ts.Expression | undefined,
): boolean {
  if (!expression) return true;
  if (
    expression.kind === ts.SyntaxKind.NullKeyword ||
    expression.kind === ts.SyntaxKind.UndefinedKeyword
  ) return true;
  if (ts.isStringLiteralLike(expression)) {
    const text = expression.text.trim();
    return text === "" || text === "[]" || text === "{}";
  }
  return false;
}

export function derivePersistentDataLifecycleEvidence(
  text: string,
  source: SourceRef,
): PersistentDataLifecycleEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );

  const variableToKey = new Map<string, string>();
  const firstSource = new Map<string, SourceRef>();
  const stats = new Map<
    string,
    { variable: string; reads: number; appends: number; writes: number; clears: number }
  >();

  const ensure = (key: string, variable: string, node: ts.Node) => {
    const current = stats.get(key);
    if (current) return current;
    const created = { variable, reads: 0, appends: 0, writes: 0, clears: 0 };
    stats.set(key, created);
    firstSource.set(key, nodeSource(file, node, source));
    return created;
  };

  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      const key = containsDynamicPropertyRead(node.initializer);
      if (key) {
        variableToKey.set(node.name.text, key);
        ensure(key, node.name.text, node).reads += 1;
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "push" &&
      ts.isIdentifier(node.expression.expression)
    ) {
      const variable = node.expression.expression.text;
      const key = variableToKey.get(variable);
      if (key) ensure(key, variable, node).appends += 1;
    }

    const writtenKey = dynamicPropertyKey(node, "setDynamicProperty");
    if (writtenKey && ts.isCallExpression(node)) {
      const value = node.arguments[1];
      const matchedVariable = [...variableToKey.entries()].find(
        ([variable, key]) =>
          key === writtenKey &&
          value?.getText(file).includes(variable),
      )?.[0] ?? "$unknown";
      const current = ensure(writtenKey, matchedVariable, node);
      if (isClearValue(value)) current.clears += 1;
      else current.writes += 1;
    }

    ts.forEachChild(node, visit);
  };

  visit(file);

  return [...stats.entries()]
    .map(([propertyKey, item]) => ({
      propertyKey,
      variable: item.variable,
      reads: item.reads,
      appends: item.appends,
      writes: item.writes,
      clears: item.clears,
      growth:
        item.appends === 0
          ? "no-append"
          : item.writes === 0
            ? "unknown"
            : item.clears > 0
              ? "append-with-clear"
              : "append-without-clear",
      source: firstSource.get(propertyKey)!,
    }))
    .sort((a, b) => a.propertyKey.localeCompare(b.propertyKey));
}
