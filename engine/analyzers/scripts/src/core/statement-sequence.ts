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
  return {
    blockSource: at(file, block, source),
    precedingControlExitSources: preceding
      .filter(prev => hasDescendant(prev, controlExit))
      .map(prev => at(file, prev, source)),
    precedingReceiverRebindingSources: preceding
      .filter(prev => hasDescendant(prev, item => rebindsReceiver(item, receiver)))
      .map(prev => at(file, prev, source)),
  };
}
