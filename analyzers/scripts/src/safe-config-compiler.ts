import ts from "typescript";
import type {
  SafeConfigExpression,
} from "../../../packages/behavior-model/src/index.js";
import type {
  SourceRef,
} from "../../../packages/project-model/src/index.js";

export interface ScriptSafeConfigBinding {
  name: string;
  expression: SafeConfigExpression;
  source: SourceRef;
}

export interface ScriptSafeConfigRejection {
  name?: string;
  reason:
    | "non-const"
    | "destructuring"
    | "unsupported-expression"
    | "unsupported-property"
    | "unsupported-call";
  detail: string;
  source: SourceRef;
}

export interface ScriptSafeConfigCompilation {
  bindings: readonly ScriptSafeConfigBinding[];
  rejected: readonly ScriptSafeConfigRejection[];
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
  const start = file.getLineAndCharacterOfPosition(
    node.getStart(file),
  );
  const end = file.getLineAndCharacterOfPosition(
    node.getEnd(),
  );
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

function propertyName(
  node: ts.PropertyName,
): string | undefined {
  if (
    ts.isIdentifier(node) ||
    ts.isStringLiteralLike(node) ||
    ts.isNumericLiteral(node)
  ) {
    return node.text;
  }
  return undefined;
}

export function compileSafeConfigExpression(
  expression: ts.Expression,
): SafeConfigExpression | undefined {
  const value =
    ts.isParenthesizedExpression(expression)
      ? expression.expression
      : expression;

  if (ts.isStringLiteralLike(value)) {
    return {
      kind: "literal",
      value: value.text,
    };
  }
  if (ts.isNumericLiteral(value)) {
    const number = Number(value.text);
    return Number.isFinite(number)
      ? { kind: "literal", value: number }
      : undefined;
  }
  if (value.kind === ts.SyntaxKind.TrueKeyword) {
    return { kind: "literal", value: true };
  }
  if (value.kind === ts.SyntaxKind.FalseKeyword) {
    return { kind: "literal", value: false };
  }
  if (value.kind === ts.SyntaxKind.NullKeyword) {
    return { kind: "literal", value: null };
  }

  if (ts.isIdentifier(value)) {
    return {
      kind: "ref",
      name: value.text,
    };
  }

  if (
    ts.isPrefixUnaryExpression(value) &&
    (
      value.operator === ts.SyntaxKind.PlusToken ||
      value.operator === ts.SyntaxKind.MinusToken
    )
  ) {
    const operand = compileSafeConfigExpression(value.operand);
    if (!operand) return undefined;
    return {
      kind: "binary",
      operator:
        value.operator === ts.SyntaxKind.PlusToken
          ? "+"
          : "-",
      left: { kind: "literal", value: 0 },
      right: operand,
    };
  }

  if (ts.isArrayLiteralExpression(value)) {
    const items: SafeConfigExpression[] = [];
    for (const item of value.elements) {
      if (ts.isSpreadElement(item)) return undefined;
      const compiled = compileSafeConfigExpression(item);
      if (!compiled) return undefined;
      items.push(compiled);
    }
    return { kind: "array", items };
  }

  if (ts.isObjectLiteralExpression(value)) {
    const entries: Record<string, SafeConfigExpression> = {};
    for (const property of value.properties) {
      if (!ts.isPropertyAssignment(property)) return undefined;
      const key = propertyName(property.name);
      if (key === undefined) return undefined;
      const compiled = compileSafeConfigExpression(property.initializer);
      if (!compiled) return undefined;
      entries[key] = compiled;
    }
    return { kind: "object", entries };
  }

  if (ts.isPropertyAccessExpression(value)) {
    const object = compileSafeConfigExpression(value.expression);
    if (!object) return undefined;
    return {
      kind: "get",
      object,
      key: value.name.text,
    };
  }

  if (ts.isElementAccessExpression(value)) {
    const object = compileSafeConfigExpression(value.expression);
    const argument = value.argumentExpression;
    if (
      !object ||
      !argument ||
      (
        !ts.isStringLiteralLike(argument) &&
        !ts.isNumericLiteral(argument)
      )
    ) {
      return undefined;
    }
    return {
      kind: "get",
      object,
      key: argument.text,
    };
  }

  if (ts.isBinaryExpression(value)) {
    const operator =
      value.operatorToken.kind === ts.SyntaxKind.PlusToken
        ? "+"
        : value.operatorToken.kind === ts.SyntaxKind.MinusToken
          ? "-"
          : value.operatorToken.kind === ts.SyntaxKind.AsteriskToken
            ? "*"
            : value.operatorToken.kind === ts.SyntaxKind.SlashToken
              ? "/"
              : undefined;
    if (!operator) return undefined;
    const left = compileSafeConfigExpression(value.left);
    const right = compileSafeConfigExpression(value.right);
    if (!left || !right) return undefined;
    return {
      kind: "binary",
      operator,
      left,
      right,
    };
  }

  if (
    ts.isCallExpression(value) &&
    ts.isIdentifier(value.expression) &&
    value.expression.text === "translate3"
  ) {
    const args = value.arguments.map(compileExpression);
    if (
      args.length !== 2 ||
      args.some(
        (item): item is undefined => item === undefined,
      )
    ) {
      return undefined;
    }
    return {
      kind: "intrinsic",
      name: "translate3",
      args: args as SafeConfigExpression[],
    };
  }

  return undefined;
}

function rejectionReason(
  expression: ts.Expression,
): ScriptSafeConfigRejection["reason"] {
  if (ts.isCallExpression(expression)) {
    return "unsupported-call";
  }
  if (
    ts.isObjectLiteralExpression(expression) &&
    expression.properties.some(
      (property) =>
        !ts.isPropertyAssignment(property) ||
        propertyName(property.name) === undefined,
    )
  ) {
    return "unsupported-property";
  }
  return "unsupported-expression";
}

export function compileScriptSafeConfig(
  text: string,
  source: SourceRef,
): ScriptSafeConfigCompilation {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );

  const bindings: ScriptSafeConfigBinding[] = [];
  const rejected: ScriptSafeConfigRejection[] = [];

  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;

    const isConst =
      (statement.declarationList.flags &
        ts.NodeFlags.Const) !== 0;

    for (const declaration of
      statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) {
        rejected.push({
          reason: "destructuring",
          detail:
            "Only identifier bindings are accepted by safe config compilation.",
          source: nodeSource(file, declaration, source),
        });
        continue;
      }

      const name = declaration.name.text;
      if (!isConst) {
        rejected.push({
          name,
          reason: "non-const",
          detail:
            "Only top-level const declarations are accepted by safe config compilation.",
          source: nodeSource(file, declaration, source),
        });
        continue;
      }

      if (!declaration.initializer) continue;
      const expression =
        compileSafeConfigExpression(declaration.initializer);
      if (!expression) {
        rejected.push({
          name,
          reason:
            rejectionReason(declaration.initializer),
          detail:
            "Initializer is outside the deterministic safe-config subset and was not executed.",
          source: nodeSource(file, declaration, source),
        });
        continue;
      }

      bindings.push({
        name,
        expression,
        source: nodeSource(file, declaration, source),
      });
    }
  }

  return {
    bindings: bindings.sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
    rejected: rejected.sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "") ||
      (a.source.range?.lineStart ?? 0) -
        (b.source.range?.lineStart ?? 0)
    ),
  };
}
