import ts from "typescript";
import type {
  SourceRef,
} from "../../../../../packages/project-model/src/index.js";
import type {
  ScriptPersistenceIdempotencyGuard,
} from "../../core/types.js";

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".ts")) return ts.ScriptKind.TS;
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function lineSource(
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

function localExecutionRegionId(
  node: ts.Node,
  file: ts.SourceFile,
): string {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current)) {
      return current.name
        ? "function:" + current.name.text
        : "anonymous-function";
    }
    if (ts.isMethodDeclaration(current)) {
      const name = current.name;
      if (
        ts.isIdentifier(name) ||
        ts.isStringLiteralLike(name)
      ) {
        return "function:" + name.text;
      }
    }
    if (
      ts.isArrowFunction(current) ||
      ts.isFunctionExpression(current)
    ) {
      const start =
        file.getLineAndCharacterOfPosition(
          current.getStart(file),
        );
      return (
        "callback@" +
        (start.line + 1) +
        ":" +
        (start.character + 1)
      );
    }
    current = current.parent;
  }
  return "module";
}

function dynamicPropertyCall(
  expression: ts.Expression,
  method:
    | "getDynamicProperty"
    | "setDynamicProperty",
): ts.CallExpression | undefined {
  if (!ts.isCallExpression(expression)) {
    return undefined;
  }
  if (
    !ts.isPropertyAccessExpression(
      expression.expression,
    ) ||
    expression.expression.name.text !== method
  ) {
    return undefined;
  }
  return expression;
}

function stringArgument(
  call: ts.CallExpression,
  index: number,
): string | undefined {
  const arg = call.arguments[index];
  return arg &&
      ts.isStringLiteralLike(arg)
    ? arg.text
    : undefined;
}

function previousAppliedMarker(
  statements: readonly ts.Statement[],
  beforeIndex: number,
  propertyKey: string,
): string | undefined {
  for (
    let index = beforeIndex - 1;
    index >= 0;
    index -= 1
  ) {
    const statement = statements[index]!;
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    if (
      (statement.declarationList.flags &
        ts.NodeFlags.Const) === 0
    ) {
      continue;
    }

    for (
      const declaration of
        statement.declarationList.declarations
    ) {
      if (
        !ts.isIdentifier(declaration.name) ||
        !declaration.initializer
      ) {
        continue;
      }
      const read = dynamicPropertyCall(
        declaration.initializer,
        "getDynamicProperty",
      );
      if (
        read &&
        stringArgument(read, 0) ===
          propertyKey
      ) {
        return declaration.name.text;
      }
    }
  }
  return undefined;
}

function directSideEffect(
  statement: ts.Statement,
): ts.ExpressionStatement | undefined {
  if (!ts.isExpressionStatement(statement)) {
    return undefined;
  }
  const expression = statement.expression;
  if (!ts.isCallExpression(expression)) {
    return undefined;
  }
  if (
    dynamicPropertyCall(
      expression,
      "getDynamicProperty",
    ) ||
    dynamicPropertyCall(
      expression,
      "setDynamicProperty",
    )
  ) {
    return undefined;
  }
  return statement;
}

function guardedIdentifiers(
  condition: ts.Expression,
):
  | {
      left: string;
      right: string;
    }
  | undefined {
  if (
    !ts.isBinaryExpression(condition) ||
    ![
      ts.SyntaxKind.ExclamationEqualsToken,
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
    ].includes(condition.operatorToken.kind) ||
    !ts.isIdentifier(condition.left) ||
    !ts.isIdentifier(condition.right)
  ) {
    return undefined;
  }

  return {
    left: condition.left.text,
    right: condition.right.text,
  };
}

export function derivePersistenceIdempotencyGuards(
  text: string,
  source: SourceRef,
): ScriptPersistenceIdempotencyGuard[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );
  const output: ScriptPersistenceIdempotencyGuard[] = [];

  const visit = (node: ts.Node): void => {
    if (!ts.isIfStatement(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    const parent = node.parent;
    if (!ts.isBlock(parent)) {
      ts.forEachChild(node, visit);
      return;
    }

    const index = parent.statements.indexOf(node);
    if (
      index < 1 ||
      index + 1 >= parent.statements.length
    ) {
      ts.forEachChild(node, visit);
      return;
    }

    const identifiers = guardedIdentifiers(
      node.expression,
    );
    if (!identifiers) {
      ts.forEachChild(node, visit);
      return;
    }

    const sideEffect =
      directSideEffect(node.thenStatement);
    if (!sideEffect) {
      ts.forEachChild(node, visit);
      return;
    }

    const markerWriteStatement =
      parent.statements[index + 1];
    if (
      !markerWriteStatement ||
      !ts.isExpressionStatement(
        markerWriteStatement,
      )
    ) {
      ts.forEachChild(node, visit);
      return;
    }

    const markerWrite = dynamicPropertyCall(
      markerWriteStatement.expression,
      "setDynamicProperty",
    );
    if (!markerWrite) {
      ts.forEachChild(node, visit);
      return;
    }

    const propertyKey =
      stringArgument(markerWrite, 0);
    const journalArgument =
      markerWrite.arguments[1];
    if (
      !propertyKey ||
      !journalArgument ||
      !ts.isIdentifier(journalArgument)
    ) {
      ts.forEachChild(node, visit);
      return;
    }

    const appliedIdentifier =
      previousAppliedMarker(
        parent.statements,
        index,
        propertyKey,
      );
    if (!appliedIdentifier) {
      ts.forEachChild(node, visit);
      return;
    }

    const journalIdentifier =
      journalArgument.text;
    const pairMatches =
      (
        identifiers.left ===
          appliedIdentifier &&
        identifiers.right ===
          journalIdentifier
      ) ||
      (
        identifiers.right ===
          appliedIdentifier &&
        identifiers.left ===
          journalIdentifier
      );
    if (!pairMatches) {
      ts.forEachChild(node, visit);
      return;
    }

    output.push({
      propertyKey,
      appliedExpression:
        appliedIdentifier,
      journalExpression:
        journalIdentifier,
      sideEffectExpression:
        sideEffect.expression.getText(file),
      executionRegion:
        localExecutionRegionId(node, file),
      conditionSource: lineSource(
        file,
        node.expression,
        source,
      ),
      sideEffectSource: lineSource(
        file,
        sideEffect,
        source,
      ),
      journalWriteSource: lineSource(
        file,
        markerWriteStatement,
        source,
      ),
    });

    ts.forEachChild(node, visit);
  };

  visit(file);

  return output.sort((a, b) =>
    a.conditionSource.relativePath.localeCompare(
      b.conditionSource.relativePath,
    ) ||
    (
      a.conditionSource.range?.lineStart ?? 0
    ) -
      (
        b.conditionSource.range?.lineStart ?? 0
      )
  );
}
