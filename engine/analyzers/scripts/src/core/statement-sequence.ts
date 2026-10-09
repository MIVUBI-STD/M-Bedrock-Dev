import ts from "typescript";
import type { SourceRef } from "../../../../packages/project-model/src/index.js";

/**
 * Source-local necessary context for one direct synchronous statement.
 * This does not prove runtime execution, object identity or result success.
 */
export interface ScriptSequentialPathEvidence {
  readonly blockSource: SourceRef;
  readonly precedingControlExitSources: readonly SourceRef[];
  readonly precedingReceiverRebindingSources: readonly SourceRef[];
  /** Unknown call effects touching the receiver (or a potential alias). */
  readonly precedingReceiverCallSources: readonly SourceRef[];
  /** Receiver (or alias) stored on another object; its effects are unknown. */
  readonly precedingReceiverEscapeSources: readonly SourceRef[];
}

function at(file: ts.SourceFile, node: ts.Node, source: SourceRef): SourceRef {
  const start = file.getLineAndCharacterOfPosition(node.getStart(file));
  const end = file.getLineAndCharacterOfPosition(node.getEnd());
  return {
    ...source,
    range: {
      lineStart: start.line + 1, columnStart: start.character + 1,
      lineEnd: end.line + 1, columnEnd: end.character + 1,
    },
  };
}

function hasDescendant(
  node: ts.Node,
  predicate: (item: ts.Node) => boolean,
): boolean {
  if (predicate(node)) return true;
  // A callback declared in a previous statement is not executed merely by
  // being declared. Do not let its exits/rebindings contaminate siblings.
  if (ts.isFunctionLike(node)) return false;
  let found = false;
  ts.forEachChild(node, child => {
    if (!found && hasDescendant(child, predicate)) found = true;
  });
  return found;
}

function controlExit(node: ts.Node): boolean {
  return ts.isReturnStatement(node) ||
    ts.isThrowStatement(node) ||
    ts.isBreakStatement(node) ||
    ts.isContinueStatement(node);
}

function rebindsReceiver(node: ts.Node, receiver: string): boolean {
  if (ts.isBinaryExpression(node) &&
      [
        ts.SyntaxKind.EqualsToken,
        ts.SyntaxKind.BarBarEqualsToken,
        ts.SyntaxKind.AmpersandAmpersandEqualsToken,
        ts.SyntaxKind.QuestionQuestionEqualsToken,
      ].includes(node.operatorToken.kind)) {
    const target = node.left.getText();
    return target === receiver || receiver.startsWith(target + ".");
  }
  if (ts.isVariableDeclaration(node) && node.initializer &&
      ts.isIdentifier(node.name)) {
    const target = node.name.text;
    return target === receiver || receiver.startsWith(target + ".");
  }
  return false;
}

/**
 * A call can mutate or escape a receiver passed as argument, used as method
 * receiver, or captured in a callback. This is a conservative source fact,
 * not a declaration that the call actually mutates the receiver.
 */
function referencesReceiver(
  node: ts.Node,
  names: ReadonlySet<string>,
): boolean {
  if (ts.isIdentifier(node) && names.has(node.text)) return true;
  // Property names are keys, not receiver references: other.arena() must
  // not alias a local variable named arena.
  if (ts.isPropertyAccessExpression(node)) {
    return referencesReceiver(node.expression, names);
  }
  if (ts.isPropertyAssignment(node)) {
    return referencesReceiver(node.initializer, names) ||
      (ts.isComputedPropertyName(node.name) &&
        referencesReceiver(node.name.expression, names));
  }
  if (node.kind === ts.SyntaxKind.ThisKeyword && names.has("this")) {
    return true;
  }
  let seen = false;
  ts.forEachChild(node, child => {
    if (!seen && referencesReceiver(child, names)) seen = true;
  });
  return seen;
}

function receiverCall(
  node: ts.Node,
  names: ReadonlySet<string>,
): boolean {
  // Constructors can retain arguments just like ordinary calls.
  return (ts.isCallExpression(node) || ts.isNewExpression(node)) &&
    (referencesReceiver(node.expression, names) ||
      (node.arguments ?? []).some(arg => referencesReceiver(arg, names)));
}

/**
 * Only direct expression statements whose receiver is a simple lexical
 * identifier/property path can carry source sequence identity. Earlier
 * returns/throws/breaks and receiver assignments in this SAME block are
 * tracked as barriers; unknown/dynamic receivers remain uncorrelated.
 */
export function directStatementSequence(
  node: ts.Node,
  receiver: string,
  file: ts.SourceFile,
  source: SourceRef,
): ScriptSequentialPathEvidence | undefined {
  const statement = ts.isExpressionStatement(node)
    ? node
    : ts.isCallExpression(node) &&
        ts.isExpressionStatement(node.parent) &&
        node.parent.expression === node
      ? node.parent
      : undefined;
  if (!statement) return undefined;
  const block = statement.parent;
  if (!ts.isBlock(block) && !ts.isSourceFile(block)) return undefined;
  if (!/^(?:this|[A-Za-z_$][\w$]*)(?:\.[A-Za-z_$][\w$]*)*$/.test(receiver)) {
    return undefined;
  }
  const index = block.statements.indexOf(statement);
  if (index < 0) return undefined;
  const preceding = block.statements.slice(0, index);
  const root = receiver.split(".")[0]!;
  const names = new Set<string>([root]);
  const callSources: SourceRef[] = [];
  const escapeSources: SourceRef[] = [];

  const aliasValue = (expression: ts.Expression): boolean => {
    if (ts.isParenthesizedExpression(expression) ||
        ts.isAsExpression(expression) ||
        ts.isTypeAssertionExpression(expression) ||
        ts.isNonNullExpression(expression)) {
      return aliasValue(expression.expression);
    }
    if (ts.isIdentifier(expression)) return names.has(expression.text);
    // This is a possible alias to receiver-owned state, not proof of
    // matching runtime instance identity.
    if (ts.isPropertyAccessExpression(expression)) {
      return aliasValue(expression.expression);
    }
    if (ts.isObjectLiteralExpression(expression)) {
      return expression.properties.some(property =>
        ts.isPropertyAssignment(property)
          ? aliasValue(property.initializer)
          : ts.isShorthandPropertyAssignment(property)
            ? names.has(property.name.text)
            : ts.isSpreadAssignment(property)
              ? aliasValue(property.expression)
              : ts.isMethodDeclaration(property) ||
                  ts.isGetAccessorDeclaration(property) ||
                  ts.isSetAccessorDeclaration(property)
                ? property.body !== undefined &&
                    referencesReceiver(property.body, names)
                : false);
    }
    if (ts.isArrayLiteralExpression(expression)) {
      return expression.elements.some(element =>
        ts.isSpreadElement(element)
          ? aliasValue(element.expression) : aliasValue(element));
    }
    if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
      // A callable can capture an existing alias, which escapes if passed
      // to an unknown function. The closure's execution remains unknown.
      return referencesReceiver(expression.body, names);
    }
    if (ts.isConditionalExpression(expression)) {
      return aliasValue(expression.whenTrue) || aliasValue(expression.whenFalse);
    }
    if (ts.isBinaryExpression(expression) &&
        [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken,
         ts.SyntaxKind.AmpersandAmpersandToken].includes(
          expression.operatorToken.kind)) {
      return aliasValue(expression.left) || aliasValue(expression.right);
    }
    return expression.kind === ts.SyntaxKind.ThisKeyword && names.has("this");
  };

  for (const previous of preceding) {
    // Traverse one preceding statement in source order. A mutable local may
    // gain a receiver alias via "let ref = arena" or "ref = arena", and a
    // second alias may be assigned from ref before a later helper call.
    // Keep possible aliases even after reassignment: without SSA/runtime
    // evidence, removing them would incorrectly prove call purity.
    let foundCall = false;
    let foundEscape = false;
    const visit = (node: ts.Node): void => {
      if (ts.isFunctionLike(node)) return;
      if (ts.isVariableDeclaration(node) &&
          ts.isIdentifier(node.name) &&
          node.initializer && aliasValue(node.initializer)) {
        names.add(node.name.text);
      }
      if (ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          ts.isIdentifier(node.left) && aliasValue(node.right)) {
        names.add(node.left.text);
      }
      if (ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          (ts.isPropertyAccessExpression(node.left) ||
            ts.isElementAccessExpression(node.left)) &&
          aliasValue(node.right)) {
        // The receiver escapes into an externally reachable storage
        // surface; source alone cannot prove who will later mutate it.
        foundEscape = true;
      }
      if (receiverCall(node, names)) foundCall = true;
      ts.forEachChild(node, visit);
    };
    visit(previous);
    if (foundCall) callSources.push(at(file, previous, source));
    if (foundEscape) escapeSources.push(at(file, previous, source));
  }
  return {
    blockSource: at(file, block, source),
    precedingControlExitSources: preceding
      .filter(prev => hasDescendant(prev, controlExit))
      .map(prev => at(file, prev, source)),
    precedingReceiverRebindingSources: preceding
      .filter(prev => hasDescendant(prev, item => rebindsReceiver(item, receiver)))
      .map(prev => at(file, prev, source)),
    precedingReceiverCallSources: callSources,
    precedingReceiverEscapeSources: escapeSources,
  };
}
