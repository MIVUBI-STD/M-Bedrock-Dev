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

export interface ScriptProgressionActiveEventEvidence {
  readonly event: string;
  readonly executionRegion: string;
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

const ACTIVE_STATE_LITERAL =
  /^(?:active|running|combat|wave|round|playing|in_progress|in-progress)$/i;

function conditionProvesActiveState(
  expression: ts.Expression,
  file: ts.SourceFile,
): boolean {
  if (
    ts.isParenthesizedExpression(expression)
  ) {
    return conditionProvesActiveState(
      expression.expression,
      file,
    );
  }

  if (
    ts.isBinaryExpression(expression) &&
    (
      expression.operatorToken.kind ===
        ts.SyntaxKind.EqualsEqualsToken ||
      expression.operatorToken.kind ===
        ts.SyntaxKind.EqualsEqualsEqualsToken
    )
  ) {
    const pairs: readonly [
      ts.Expression,
      ts.Expression,
    ][] = [
      [expression.left, expression.right],
      [expression.right, expression.left],
    ];
    return pairs.some(
      ([candidate, literal]) => {
        const value =
          literalString(literal);
        if (
          value === undefined ||
          !ACTIVE_STATE_LITERAL.test(value)
        ) {
          return false;
        }
        const target =
          candidate.getText(file);
        return /(?:state|status|phase|stage|wave|round|mode)/i.test(
          target,
        );
      },
    );
  }

  if (
    expression.kind ===
      ts.SyntaxKind.AmpersandAmpersandToken
  ) {
    return false;
  }

  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind ===
      ts.SyntaxKind.AmpersandAmpersandToken
  ) {
    return (
      conditionProvesActiveState(
        expression.left,
        file,
      ) ||
      conditionProvesActiveState(
        expression.right,
        file,
      )
    );
  }

  return false;
}

function isInsideActiveGuard(
  node: ts.Node,
  file: ts.SourceFile,
): boolean {
  let current: ts.Node | undefined =
    node.parent;
  while (current) {
    if (ts.isIfStatement(current)) {
      const statement =
        current.thenStatement;
      const position =
        node.getStart(file);
      if (
        position >=
          statement.getStart(file) &&
        position < statement.getEnd() &&
        conditionProvesActiveState(
          current.expression,
          file,
        )
      ) {
        return true;
      }
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
  return false;
}

function isZero(
  expression: ts.Expression,
): boolean {
  return numericLiteral(expression) === 0;
}

const PROGRESSION_EFFECT_NAME =
  /(?:next.*(?:wave|round|level|stage)|advance|progress|complete|finish|end(?:wave|round|level|stage)|proceed)/i;

function containsProgressionEffect(
  node: ts.Node,
  file: ts.SourceFile,
): boolean {
  let found = false;
  const visit = (current: ts.Node): void => {
    if (found) return;

    if (ts.isCallExpression(current)) {
      const target =
        current.expression.getText(file);
      if (
        PROGRESSION_EFFECT_NAME.test(
          target,
        )
      ) {
        found = true;
        return;
      }
    }

    if (
      ts.isBinaryExpression(current) &&
      current.operatorToken.kind ===
        ts.SyntaxKind.EqualsToken
    ) {
      const left =
        current.left.getText(file);
      const right =
        current.right.getText(file);
      if (
        /(?:state|status|phase|stage|wave|round|level|progress)/i.test(
          left,
        ) &&
        /(?:next|complete|completed|finish|finished|done|advance)/i.test(
          right,
        )
      ) {
        found = true;
        return;
      }
    }

    ts.forEachChild(
      current,
      visit,
    );
  };
  visit(node);
  return found;
}

function completionControlsProgression(
  node: ts.BinaryExpression,
  file: ts.SourceFile,
): boolean {
  let current: ts.Node | undefined =
    node.parent;

  while (current) {
    if (ts.isIfStatement(current)) {
      const start =
        current.expression.getStart(file);
      const end =
        current.expression.getEnd();
      const position =
        node.getStart(file);
      if (
        position >= start &&
        position < end
      ) {
        return (
          containsProgressionEffect(
            current.thenStatement,
            file,
          ) ||
          (
            current.elseStatement !==
              undefined &&
            containsProgressionEffect(
              current.elseStatement,
              file,
            )
          )
        );
      }
    }

    if (
      ts.isConditionalExpression(current)
    ) {
      const position =
        node.getStart(file);
      if (
        position >=
          current.condition.getStart(file) &&
        position <
          current.condition.getEnd()
      ) {
        return (
          containsProgressionEffect(
            current.whenTrue,
            file,
          ) ||
          containsProgressionEffect(
            current.whenFalse,
            file,
          )
        );
      }
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

  return false;
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
      if (
        completion &&
        completionControlsProgression(
          node,
          file,
        )
      ) {
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

export function deriveScriptProgressionActiveEventEvidence(
  text: string,
  source: SourceRef,
): ScriptProgressionActiveEventEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );
  const output:
    ScriptProgressionActiveEventEvidence[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      isInsideActiveGuard(node, file)
    ) {
      if (
        ts.isPropertyAccessExpression(
          node.expression,
        ) &&
        node.expression.name.text ===
          "triggerEvent"
      ) {
        const event =
          literalString(
            node.arguments[0],
          );
        if (event) {
          output.push({
            event,
            executionRegion:
              executionRegion(
                node,
                file,
              ),
            source:
              nodeSource(
                file,
                node,
                source,
              ),
          });
        }
      }

      if (
        ts.isPropertyAccessExpression(
          node.expression,
        ) &&
        (
          node.expression.name.text ===
            "runCommand" ||
          node.expression.name.text ===
            "runCommandAsync"
        )
      ) {
        const command =
          literalString(
            node.arguments[0],
          );
        const match =
          command?.match(
            /^\/?event\s+entity\s+\S+\s+([A-Za-z0-9_.:-]+)/i,
          );
        if (match?.[1]) {
          output.push({
            event: match[1],
            executionRegion:
              executionRegion(
                node,
                file,
              ),
            source:
              nodeSource(
                file,
                node,
                source,
              ),
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(file);

  return output
    .filter((item, index, all) =>
      all.findIndex((candidate) =>
        candidate.event === item.event &&
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
      a.event.localeCompare(b.event)
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
