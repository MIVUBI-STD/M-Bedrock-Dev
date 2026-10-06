import ts from "typescript";
import type {
  SourceRef,
} from "../../../../../packages/project-model/src/index.js";

export type ScriptProgressionCounterKind =
  | "variable"
  | "scoreboard";

export type ScriptProgressionExecutionShape =
  | "single"
  | "conditional"
  | "repeated";

export type ScriptProgressionCounterEvidenceKind =
  | "growth"
  | "decrement"
  | "replacement"
  | "completion-check";

export interface ScriptProgressionCounterEvidence {
  readonly kind:
    ScriptProgressionCounterEvidenceKind;
  readonly counterKind:
    ScriptProgressionCounterKind;
  readonly counterId: string;
  readonly executionRegion: string;
  readonly executionShape:
    ScriptProgressionExecutionShape;
  readonly amount?: number;
  readonly source: SourceRef;
}

export interface ScriptProgressionActorSpawnEvidence {
  readonly actorIdentifier: string;
  readonly executionRegion: string;
  readonly executionShape:
    ScriptProgressionExecutionShape;
  readonly source: SourceRef;
}

const COUNTER_NAME =
  /(?:wave|enemy|enemies|mob|mobs|remaining|alive|objective|progress|count)/i;

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
  const start =
    file.getLineAndCharacterOfPosition(
      node.getStart(file),
    );
  const end =
    file.getLineAndCharacterOfPosition(
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

function executionRegion(
  node: ts.Node,
  file: ts.SourceFile,
): string {
  let current: ts.Node | undefined =
    node.parent;
  while (current) {
    if (
      ts.isFunctionDeclaration(current) &&
      current.name
    ) {
      return "function:" + current.name.text;
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
        String(start.line + 1) +
        ":" +
        String(start.character + 1)
      );
    }
    current = current.parent;
  }
  return "module";
}

function executionShape(
  node: ts.Node,
): ScriptProgressionExecutionShape {
  let current: ts.Node | undefined =
    node.parent;
  let conditional = false;

  while (current) {
    if (
      ts.isForStatement(current) ||
      ts.isForInStatement(current) ||
      ts.isForOfStatement(current) ||
      ts.isWhileStatement(current) ||
      ts.isDoStatement(current)
    ) {
      return "repeated";
    }
    if (
      ts.isIfStatement(current) ||
      ts.isConditionalExpression(current) ||
      ts.isCaseClause(current) ||
      ts.isDefaultClause(current) ||
      ts.isSwitchStatement(current)
    ) {
      conditional = true;
    }
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isArrowFunction(current) ||
      ts.isFunctionExpression(current)
    ) {
      break;
    }
    current = current.parent;
  }

  return conditional
    ? "conditional"
    : "single";
}

function counterId(
  expression: ts.Expression,
): string | undefined {
  if (ts.isIdentifier(expression)) {
    return COUNTER_NAME.test(expression.text)
      ? expression.text
      : undefined;
  }
  if (
    ts.isPropertyAccessExpression(expression)
  ) {
    return COUNTER_NAME.test(
      expression.name.text,
    )
      ? expression.getText()
      : undefined;
  }
  return undefined;
}

function numericLiteral(
  expression: ts.Expression,
): number | undefined {
  if (ts.isNumericLiteral(expression)) {
    return Number(expression.text);
  }
  if (
    ts.isPrefixUnaryExpression(expression) &&
    ts.isNumericLiteral(expression.operand)
  ) {
    const value =
      Number(expression.operand.text);
    if (
      expression.operator ===
      ts.SyntaxKind.MinusToken
    ) {
      return -value;
    }
    if (
      expression.operator ===
      ts.SyntaxKind.PlusToken
    ) {
      return value;
    }
  }
  return undefined;
}

function literalString(
  expression: ts.Expression | undefined,
): string | undefined {
  return (
    expression &&
    (
      ts.isStringLiteralLike(expression) ||
      ts.isNoSubstitutionTemplateLiteral(
        expression,
      )
    )
  )
    ? expression.text
    : undefined;
}

function isZero(
  expression: ts.Expression,
): boolean {
  return numericLiteral(expression) === 0;
}

function completionCounter(
  node: ts.BinaryExpression,
): string | undefined {
  const operator =
    node.operatorToken.kind;
  const direct =
    counterId(node.left);
  const reverse =
    counterId(node.right);

  if (
    direct &&
    isZero(node.right) &&
    (
      operator ===
        ts.SyntaxKind.EqualsEqualsToken ||
      operator ===
        ts.SyntaxKind.EqualsEqualsEqualsToken ||
      operator ===
        ts.SyntaxKind.LessThanEqualsToken
    )
  ) {
    return direct;
  }

  if (
    reverse &&
    isZero(node.left) &&
    (
      operator ===
        ts.SyntaxKind.EqualsEqualsToken ||
      operator ===
        ts.SyntaxKind.EqualsEqualsEqualsToken ||
      operator ===
        ts.SyntaxKind.GreaterThanEqualsToken
    )
  ) {
    return reverse;
  }

  return undefined;
}

export function deriveScriptProgressionCounterEvidence(
  text: string,
  source: SourceRef,
): ScriptProgressionCounterEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );
  const output:
    ScriptProgressionCounterEvidence[] = [];

  const push = (
    node: ts.Node,
    values: Omit<
      ScriptProgressionCounterEvidence,
      "executionRegion" |
      "executionShape" |
      "source"
    >,
  ) => {
    output.push({
      ...values,
      executionRegion:
        executionRegion(node, file),
      executionShape:
        executionShape(node),
      source: nodeSource(
        file,
        node,
        source,
      ),
    });
  };

  const visit = (node: ts.Node): void => {
    if (
      ts.isPrefixUnaryExpression(node) ||
      ts.isPostfixUnaryExpression(node)
    ) {
      const id =
        counterId(node.operand);
      if (id) {
        if (
          node.operator ===
          ts.SyntaxKind.PlusPlusToken
        ) {
          push(node, {
            kind: "growth",
            counterKind: "variable",
            counterId: id,
            amount: 1,
          });
        } else if (
          node.operator ===
          ts.SyntaxKind.MinusMinusToken
        ) {
          push(node, {
            kind: "decrement",
            counterKind: "variable",
            counterId: id,
            amount: 1,
          });
        }
      }
    }

    if (ts.isBinaryExpression(node)) {
      const id =
        counterId(node.left);
      const operator =
        node.operatorToken.kind;

      if (id) {
        if (
          operator ===
          ts.SyntaxKind.PlusEqualsToken
        ) {
          const amount =
            numericLiteral(node.right);
          if (
            amount !== undefined &&
            amount > 0
          ) {
            push(node, {
              kind: "growth",
              counterKind: "variable",
              counterId: id,
              amount,
            });
          } else if (
            amount !== undefined &&
            amount < 0
          ) {
            push(node, {
              kind: "decrement",
              counterKind: "variable",
              counterId: id,
              amount:
                Math.abs(amount),
            });
          }
        } else if (
          operator ===
          ts.SyntaxKind.MinusEqualsToken
        ) {
          const amount =
            numericLiteral(node.right);
          if (
            amount !== undefined &&
            amount > 0
          ) {
            push(node, {
              kind: "decrement",
              counterKind: "variable",
              counterId: id,
              amount,
            });
          }
        } else if (
          operator ===
          ts.SyntaxKind.EqualsToken
        ) {
          push(node, {
            kind: "replacement",
            counterKind: "variable",
            counterId: id,
          });
        }
      }

      const completion =
        completionCounter(node);
      if (completion) {
        push(node, {
          kind: "completion-check",
          counterKind: "variable",
          counterId: completion,
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(file);

  return output
    .filter((item, index, all) =>
      all.findIndex((candidate) =>
        candidate.kind === item.kind &&
        candidate.counterKind ===
          item.counterKind &&
        candidate.counterId ===
          item.counterId &&
        candidate.executionRegion ===
          item.executionRegion &&
        candidate.source.range?.lineStart ===
          item.source.range?.lineStart
      ) === index
    )
    .sort((a, b) =>
      a.executionRegion.localeCompare(
        b.executionRegion,
      ) ||
      a.counterId.localeCompare(
        b.counterId,
      ) ||
      a.kind.localeCompare(b.kind)
    );
}

export function deriveScriptProgressionActorSpawnEvidence(
  text: string,
  source: SourceRef,
): ScriptProgressionActorSpawnEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );
  const output:
    ScriptProgressionActorSpawnEvidence[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(
        node.expression,
      ) &&
      node.expression.name.text ===
        "spawnEntity"
    ) {
      const actorIdentifier =
        literalString(node.arguments[0]);
      if (
        actorIdentifier &&
        /^[a-z0-9_.-]+:[a-z0-9_./-]+$/i.test(
          actorIdentifier,
        )
      ) {
        output.push({
          actorIdentifier:
            actorIdentifier.toLowerCase(),
          executionRegion:
            executionRegion(node, file),
          executionShape:
            executionShape(node),
          source:
            nodeSource(
              file,
              node,
              source,
            ),
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(file);

  return output
    .filter((item, index, all) =>
      all.findIndex((candidate) =>
        candidate.actorIdentifier ===
          item.actorIdentifier &&
        candidate.executionRegion ===
          item.executionRegion &&
        candidate.source.range?.lineStart ===
          item.source.range?.lineStart
      ) === index
    )
    .sort((a, b) =>
      a.executionRegion.localeCompare(
        b.executionRegion,
      ) ||
      a.actorIdentifier.localeCompare(
        b.actorIdentifier,
      )
    );
}
