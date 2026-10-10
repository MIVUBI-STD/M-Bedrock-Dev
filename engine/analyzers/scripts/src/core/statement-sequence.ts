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

function bindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap(element =>
    ts.isOmittedExpression(element) ? [] : bindingNames(element.name));
}

function lexicalShadowNames(block: ts.Block): Set<string> {
  const names = new Set<string>();
  for (const statement of block.statements) {
    if (ts.isVariableStatement(statement) &&
        (statement.declarationList.flags & ts.NodeFlags.BlockScoped) !== 0) {
      for (const declaration of statement.declarationList.declarations) {
        for (const name of bindingNames(declaration.name)) names.add(name);
      }
    } else if (ts.isFunctionDeclaration(statement) && statement.name) {
      names.add(statement.name.text);
    } else if (ts.isClassDeclaration(statement) && statement.name) {
      names.add(statement.name.text);
    }
  }
  return names;
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
  if (ts.isFunctionLike(node)) {
    const local = new Set(names);
    for (const parameter of node.parameters) {
      for (const name of bindingNames(parameter.name)) local.delete(name);
    }
    if (ts.isFunctionExpression(node) && node.name) local.delete(node.name.text);
    const body =
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
        ? node.body : undefined;
    return body ? referencesReceiver(body, local) : false;
  }
  if (ts.isBlock(node)) {
    const local = new Set(names);
    for (const name of lexicalShadowNames(node)) local.delete(name);
    return node.statements.some(statement => referencesReceiver(statement, local));
  }
  if (ts.isCatchClause(node)) {
    const local = new Set(names);
    if (node.variableDeclaration) {
      for (const name of bindingNames(node.variableDeclaration.name)) {
        local.delete(name);
      }
    }
    return referencesReceiver(node.block, local);
  }
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
  const containerValues = new Map<string, ts.Expression>();

  const aliasValue = (
    expression: ts.Expression,
    activeNames: ReadonlySet<string>,
    containers: ReadonlyMap<string, ts.Expression>,
  ): boolean => {
    if (ts.isParenthesizedExpression(expression) ||
        ts.isAsExpression(expression) ||
        ts.isTypeAssertionExpression(expression) ||
        ts.isNonNullExpression(expression)) {
      return aliasValue(expression.expression, activeNames, containers);
    }
    if (ts.isIdentifier(expression)) return activeNames.has(expression.text);
    // This is a possible alias to receiver-owned state, not proof of
    // matching runtime instance identity.
    if (ts.isPropertyAccessExpression(expression)) {
      if (ts.isIdentifier(expression.expression)) {
        const stored = containers.get(expression.expression.text);
        if (stored && ts.isObjectLiteralExpression(stored)) {
          const exact = stored.properties.find(property =>
            (ts.isPropertyAssignment(property) ||
             ts.isShorthandPropertyAssignment(property)) &&
            (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) &&
            property.name.text === expression.name.text);
          if (exact && ts.isPropertyAssignment(exact)) {
            return aliasValue(exact.initializer, activeNames, containers);
          }
          if (exact && ts.isShorthandPropertyAssignment(exact)) {
            return activeNames.has(exact.name.text);
          }
          return false;
        }
      }
      return aliasValue(expression.expression, activeNames, containers);
    }
    if (ts.isElementAccessExpression(expression)) {
      if (ts.isIdentifier(expression.expression)) {
        const stored = containers.get(expression.expression.text);
        const index = expression.argumentExpression;
        if (stored && ts.isArrayLiteralExpression(stored) &&
            ts.isNumericLiteral(index)) {
          const element = stored.elements[Number(index.text)];
          return !!element && !ts.isOmittedExpression(element) &&
            !ts.isSpreadElement(element) &&
            aliasValue(element, activeNames, containers);
        }
      }
      return aliasValue(expression.expression, activeNames, containers);
    }
    if (ts.isObjectLiteralExpression(expression)) {
      return expression.properties.some(property =>
        ts.isPropertyAssignment(property)
          ? aliasValue(property.initializer, activeNames, containers)
          : ts.isShorthandPropertyAssignment(property)
            ? activeNames.has(property.name.text)
            : ts.isSpreadAssignment(property)
              ? aliasValue(property.expression, activeNames, containers)
              : ts.isMethodDeclaration(property) ||
                  ts.isGetAccessorDeclaration(property) ||
                  ts.isSetAccessorDeclaration(property)
                ? property.body !== undefined &&
                    referencesReceiver(property.body, activeNames)
                : false);
    }
    if (ts.isArrayLiteralExpression(expression)) {
      return expression.elements.some(element =>
        ts.isSpreadElement(element)
          ? aliasValue(element.expression, activeNames, containers)
          : aliasValue(element, activeNames, containers));
    }
    if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
      // A callable can capture an existing alias, which escapes if passed
      // to an unknown function. The closure's execution remains unknown.
      return referencesReceiver(expression, activeNames);
    }
    if (ts.isConditionalExpression(expression)) {
      return aliasValue(expression.whenTrue, activeNames, containers) ||
        aliasValue(expression.whenFalse, activeNames, containers);
    }
    if (ts.isBinaryExpression(expression) &&
        [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken,
         ts.SyntaxKind.AmpersandAmpersandToken].includes(
          expression.operatorToken.kind)) {
      return aliasValue(expression.left, activeNames, containers) ||
        aliasValue(expression.right, activeNames, containers);
    }
    return expression.kind === ts.SyntaxKind.ThisKeyword && activeNames.has("this");
  };

  const rebindingSources: SourceRef[] = [];
  for (const previous of preceding) {
    // Follow bounded lexical alias candidates in source order. A mutable
    // alias remains possible after reassignment (runtime state unknown), but
    // shadowed names inside a nested block must not refer to an outer owner.
    let foundCall = false;
    let foundEscape = false;
    let foundRebinding = false;
    const visit = (
      node: ts.Node,
      activeNames: Set<string>,
      containers: Map<string, ts.Expression>,
    ): void => {
      if (ts.isFunctionLike(node)) return;
      if (ts.isCatchClause(node)) {
        const local = new Set(activeNames);
        const localContainers = new Map(containers);
        if (node.variableDeclaration) {
          for (const name of bindingNames(node.variableDeclaration.name)) {
            local.delete(name);
            localContainers.delete(name);
          }
        }
        visit(node.block, local, localContainers);
        return;
      }
      if (ts.isBlock(node)) {
        const local = new Set(activeNames);
        const localContainers = new Map(containers);
        for (const shadowed of lexicalShadowNames(node)) {
          local.delete(shadowed);
          localContainers.delete(shadowed);
        }
        for (const statement of node.statements) {
          visit(statement, local, localContainers);
        }
        return;
      }
      if (ts.isVariableDeclaration(node) && node.initializer) {
        if (ts.isIdentifier(node.name)) {
          if (aliasValue(node.initializer, activeNames, containers)) {
            activeNames.add(node.name.text);
          }
          if (ts.isObjectLiteralExpression(node.initializer) ||
              ts.isArrayLiteralExpression(node.initializer)) {
            containers.set(node.name.text, node.initializer);
          } else if (ts.isIdentifier(node.initializer) &&
                     containers.has(node.initializer.text)) {
            containers.set(node.name.text, containers.get(node.initializer.text)!);
          }
        } else if (ts.isArrayBindingPattern(node.name) &&
                   ts.isIdentifier(node.initializer)) {
          const stored = containers.get(node.initializer.text);
          if (stored && ts.isArrayLiteralExpression(stored)) {
            node.name.elements.forEach((binding, index) => {
              if (ts.isOmittedExpression(binding)) return;
              const element = stored.elements[index];
              if (!element || ts.isOmittedExpression(element) ||
                  ts.isSpreadElement(element)) return;
              if (aliasValue(element, activeNames, containers)) {
                for (const name of bindingNames(binding.name)) {
                  activeNames.add(name);
                }
              }
            });
          }
        } else if (ts.isObjectBindingPattern(node.name) &&
                   ts.isIdentifier(node.initializer)) {
          const stored = containers.get(node.initializer.text);
          if (stored && ts.isObjectLiteralExpression(stored)) {
            for (const element of node.name.elements) {
              const key = element.propertyName ?? element.name;
              if (!ts.isIdentifier(key) && !ts.isStringLiteral(key)) continue;
              const property = stored.properties.find(item =>
                (ts.isPropertyAssignment(item) ||
                 ts.isShorthandPropertyAssignment(item)) &&
                (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) &&
                item.name.text === key.text);
              if (!property) continue;
              const aliases = ts.isPropertyAssignment(property)
                ? aliasValue(property.initializer, activeNames, containers)
                : ts.isShorthandPropertyAssignment(property) &&
                  activeNames.has(property.name.text);
              if (aliases) {
                for (const name of bindingNames(element.name)) {
                  activeNames.add(name);
                }
              }
            }
          }
        }
      }
      if (ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          ts.isIdentifier(node.left) && aliasValue(node.right, activeNames, containers)) {
        activeNames.add(node.left.text);
      }
      if (ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          (ts.isPropertyAccessExpression(node.left) ||
            ts.isElementAccessExpression(node.left))) {
        const owner = node.left.expression;
        if (aliasValue(node.right, activeNames, containers) ||
            (ts.isIdentifier(owner) && containers.has(owner.text) &&
              activeNames.has(owner.text))) {
          // Either receiver state escapes, or a receiver-bearing
          // container's known literal field/index is modified. A later
          // lookup must not rely on the initial literal as immutable.
          foundEscape = true;
        }
      }
      if (rebindsReceiver(node, receiver) && activeNames.has(root)) {
        foundRebinding = true;
      }
      if (receiverCall(node, activeNames)) foundCall = true;
      ts.forEachChild(node, child => visit(child, activeNames, containers));
    };
    visit(previous, names, containerValues);
    if (foundCall) callSources.push(at(file, previous, source));
    if (foundEscape) escapeSources.push(at(file, previous, source));
    if (foundRebinding) rebindingSources.push(at(file, previous, source));
  }
  return {
    blockSource: at(file, block, source),
    precedingControlExitSources: preceding
      .filter(prev => hasDescendant(prev, controlExit))
      .map(prev => at(file, prev, source)),
    precedingReceiverRebindingSources: rebindingSources,
    precedingReceiverCallSources: callSources,
    precedingReceiverEscapeSources: escapeSources,
  };
}
