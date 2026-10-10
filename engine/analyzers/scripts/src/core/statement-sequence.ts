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
  const invalidatedContainers = new Set<string>();

  // A carrier container and a direct receiver alias are NOT the same owner.
  const aliasValue = (
    expression: ts.Expression,
    activeNames: ReadonlySet<string>,
    containers: ReadonlyMap<string, ts.Expression>,
    visited: ReadonlySet<string> = new Set(),
  ): boolean => {
    if (ts.isParenthesizedExpression(expression) ||
        ts.isAsExpression(expression) ||
        ts.isTypeAssertionExpression(expression) ||
        ts.isNonNullExpression(expression)) {
      return aliasValue(expression.expression, activeNames, containers, visited);
    }
    if (ts.isIdentifier(expression)) {
      if (activeNames.has(expression.text) ||
          (invalidatedContainers.has(expression.text) &&
            containers.has(expression.text))) return true;
      const stored = containers.get(expression.text);
      if (!stored || visited.has(expression.text)) return false;
      const next = new Set(visited);
      next.add(expression.text);
      return aliasValue(stored, activeNames, containers, next);
    }
    // This is a possible alias to receiver-owned state, not proof of
    // matching runtime instance identity.
    const objectField = (
      stored: ts.ObjectLiteralExpression,
      key: string,
      owner: string,
    ): boolean => {
      const member = "field:" + owner + ":" + key;
      if (visited.has(member)) return false;
      const next = new Set(visited);
      next.add(member);
      const matching = stored.properties.filter(property =>
        (ts.isPropertyAssignment(property) ||
         ts.isShorthandPropertyAssignment(property) ||
         ts.isGetAccessorDeclaration(property)) &&
        (ts.isIdentifier(property.name) ||
         ts.isStringLiteralLike(property.name)) &&
        property.name.text === key);
      // Repeated literal keys or computed/spread fields make single-value
      // inference unsound. Preserve ANY possible receiver-bearing value.
      const known = matching.some(item =>
        ts.isPropertyAssignment(item)
          ? aliasValue(item.initializer, activeNames, containers, next)
          : ts.isShorthandPropertyAssignment(item)
            ? aliasValue(item.name, activeNames, containers, next)
            : ts.isGetAccessorDeclaration(item) &&
              item.body !== undefined &&
              capturesReceiver(item.body, activeNames, containers, next));
      if (known) return true;
      const hasUnknownFields = stored.properties.some(property =>
        ts.isSpreadAssignment(property) ||
        (!ts.isSpreadAssignment(property) &&
          ts.isComputedPropertyName(property.name)));
      // A computed/spread field may overwrite an explicit key, or supply
      // an unknown key. Never infer its value from one literal assignment.
      return hasUnknownFields &&
        aliasValue(stored, activeNames, containers, next);
    };

    if (ts.isPropertyAccessExpression(expression)) {
      if (ts.isIdentifier(expression.expression)) {
        const name = expression.expression.text;
        if (invalidatedContainers.has(name) && containers.has(name)) return true;
        const stored = containers.get(name);
        if (stored && ts.isObjectLiteralExpression(stored)) {
          return objectField(stored, expression.name.text, name);
        }
      }
      return aliasValue(expression.expression, activeNames, containers, visited);
    }
    if (ts.isElementAccessExpression(expression)) {
      if (ts.isIdentifier(expression.expression)) {
        const name = expression.expression.text;
        if (invalidatedContainers.has(name) && containers.has(name)) return true;
        const stored = containers.get(name);
        if (stored && ts.isObjectLiteralExpression(stored)) {
          const index = expression.argumentExpression;
          return index && ts.isStringLiteralLike(index)
            ? objectField(stored, index.text, name)
            : aliasValue(stored, activeNames, containers, visited);
        }
        if (stored && ts.isArrayLiteralExpression(stored)) {
          const index = expression.argumentExpression;
          if (index && ts.isNumericLiteral(index)) {
            const element = stored.elements[Number(index.text)];
            return !!element && !ts.isOmittedExpression(element) &&
              (ts.isSpreadElement(element)
                ? aliasValue(stored, activeNames, containers, visited)
                : aliasValue(element, activeNames, containers, visited));
          }
          // A dynamic index could select any element; preserve UNKNOWN.
          return aliasValue(stored, activeNames, containers, visited);
        }
      }
      return aliasValue(expression.expression, activeNames, containers, visited);
    }
    if (ts.isObjectLiteralExpression(expression)) {
      return expression.properties.some(property =>
        ts.isPropertyAssignment(property)
          ? aliasValue(property.initializer, activeNames, containers, visited)
          : ts.isShorthandPropertyAssignment(property)
            ? aliasValue(property.name, activeNames, containers, visited)
            : ts.isSpreadAssignment(property)
              ? aliasValue(property.expression, activeNames, containers, visited)
              : ts.isMethodDeclaration(property) ||
                  ts.isGetAccessorDeclaration(property) ||
                  ts.isSetAccessorDeclaration(property)
                ? property.body !== undefined &&
                    capturesReceiver(property.body, activeNames, containers, visited)
                : false);
    }
    if (ts.isArrayLiteralExpression(expression)) {
      return expression.elements.some(element =>
        ts.isSpreadElement(element)
          ? aliasValue(element.expression, activeNames, containers, visited)
          : aliasValue(element, activeNames, containers, visited));
    }
    if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
      // A callable can capture an existing alias, which escapes if passed
      // to an unknown function. The closure's execution remains unknown.
      return capturesReceiver(expression, activeNames, containers, visited);
    }
    if (ts.isConditionalExpression(expression)) {
      return aliasValue(expression.whenTrue, activeNames, containers, visited) ||
        aliasValue(expression.whenFalse, activeNames, containers, visited);
    }
    if (ts.isBinaryExpression(expression) &&
        [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken,
         ts.SyntaxKind.AmpersandAmpersandToken].includes(
          expression.operatorToken.kind)) {
      return aliasValue(expression.left, activeNames, containers, visited) ||
        aliasValue(expression.right, activeNames, containers, visited);
    }
    return expression.kind === ts.SyntaxKind.ThisKeyword && activeNames.has("this");
  };

  function capturesReceiver(
    node: ts.Node,
    activeNames: ReadonlySet<string>,
    containers: ReadonlyMap<string, ts.Expression>,
    visited: ReadonlySet<string> = new Set(),
  ): boolean {
    if (ts.isFunctionLike(node)) {
      const local = new Set(activeNames);
      const localContainers = new Map(containers);
      for (const parameter of node.parameters) {
        for (const name of bindingNames(parameter.name)) {
          local.delete(name);
          localContainers.delete(name);
        }
      }
      if (ts.isFunctionExpression(node) && node.name) {
        local.delete(node.name.text);
        localContainers.delete(node.name.text);
      }
      const body = ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isConstructorDeclaration(node) ||
        ts.isGetAccessorDeclaration(node) ||
        ts.isSetAccessorDeclaration(node)
          ? node.body : undefined;
      return body ? capturesReceiver(body, local, localContainers, visited) : false;
    }
    if (ts.isCatchClause(node)) {
      const local = new Set(activeNames);
      const localContainers = new Map(containers);
      if (node.variableDeclaration) {
        for (const name of bindingNames(node.variableDeclaration.name)) {
          local.delete(name);
          localContainers.delete(name);
        }
      }
      return capturesReceiver(node.block, local, localContainers, visited);
    }
    if (ts.isBlock(node)) {
      const local = new Set(activeNames);
      const localContainers = new Map(containers);
      for (const name of lexicalShadowNames(node)) {
        local.delete(name);
        localContainers.delete(name);
      }
      return node.statements.some(statement =>
        capturesReceiver(statement, local, localContainers, visited));
    }
    if (ts.isIdentifier(node) ||
        ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)) {
      return aliasValue(node, activeNames, containers, visited);
    }
    if (ts.isPropertyAssignment(node)) {
      return capturesReceiver(node.initializer, activeNames, containers, visited) ||
        (ts.isComputedPropertyName(node.name) &&
          capturesReceiver(node.name.expression, activeNames, containers, visited));
    }
    let found = false;
    ts.forEachChild(node, child => {
      if (!found && capturesReceiver(child, activeNames, containers, visited)) found = true;
    });
    return found;
  }

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
        const shadows = node.variableDeclaration
          ? bindingNames(node.variableDeclaration.name) : [];
        const wasInvalidated = shadows.filter(name =>
          invalidatedContainers.has(name));
        for (const name of shadows) {
          local.delete(name);
          localContainers.delete(name);
          invalidatedContainers.delete(name);
        }
        visit(node.block, local, localContainers);
        for (const name of shadows) invalidatedContainers.delete(name);
        for (const name of wasInvalidated) invalidatedContainers.add(name);
        return;
      }
      if (ts.isBlock(node)) {
        const local = new Set(activeNames);
        const localContainers = new Map(containers);
        const shadows = lexicalShadowNames(node);
        const wasInvalidated = [...shadows].filter(name =>
          invalidatedContainers.has(name));
        for (const shadowed of shadows) {
          local.delete(shadowed);
          localContainers.delete(shadowed);
          invalidatedContainers.delete(shadowed);
        }
        for (const statement of node.statements) {
          visit(statement, local, localContainers);
        }
        for (const name of shadows) invalidatedContainers.delete(name);
        for (const name of wasInvalidated) invalidatedContainers.add(name);
        return;
      }
      if (ts.isVariableDeclaration(node) && node.initializer) {
        if (ts.isIdentifier(node.name)) {
          if (ts.isObjectLiteralExpression(node.initializer) ||
              ts.isArrayLiteralExpression(node.initializer)) {
            containers.set(node.name.text, node.initializer);
          } else if (ts.isIdentifier(node.initializer) &&
                     containers.has(node.initializer.text)) {
            containers.set(node.name.text, containers.get(node.initializer.text)!);
          } else if (aliasValue(node.initializer, activeNames, containers)) {
            activeNames.add(node.name.text);
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
          ts.isIdentifier(node.left)) {
        const target = node.left.text;
        if (ts.isObjectLiteralExpression(node.right) ||
            ts.isArrayLiteralExpression(node.right)) {
          containers.set(target, node.right);
          invalidatedContainers.delete(target);
        } else if (ts.isIdentifier(node.right) &&
                   containers.has(node.right.text)) {
          containers.set(target, containers.get(node.right.text)!);
          if (invalidatedContainers.has(node.right.text)) {
            invalidatedContainers.add(target);
          } else {
            invalidatedContainers.delete(target);
          }
        } else if (aliasValue(node.right, activeNames, containers)) {
          activeNames.add(target);
          containers.delete(target);
          invalidatedContainers.delete(target);
        } else if (containers.has(target)) {
          // A previously receiver-bearing carrier was replaced by an
          // unresolved value. Do not trust any of its old literal fields.
          invalidatedContainers.add(target);
        }
      }
      if (ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          (ts.isPropertyAccessExpression(node.left) ||
            ts.isElementAccessExpression(node.left))) {
        const owner = node.left.expression;
        const stored = ts.isIdentifier(owner)
          ? containers.get(owner.text) : undefined;
        if (aliasValue(node.right, activeNames, containers) ||
            (stored !== undefined &&
              aliasValue(stored, activeNames, containers))) {
          // Either the receiver escapes to an external surface or a
          // carrier's initial literal is invalidated. Later field reads
          // cannot use the initial literal as guaranteed current data.
          foundEscape = true;
          if (ts.isIdentifier(owner)) {
            const literal = containers.get(owner.text);
            if (literal === undefined) {
              invalidatedContainers.add(owner.text);
            } else {
              // "const alias = holder" shares the SAME literal object/array
              // source. Mutating through either identifier invalidates every
              // corresponding literal-field/index assumption, not just the
              // identifier used on the left-hand side.
              for (const [name, value] of containers) {
                if (value === literal) invalidatedContainers.add(name);
              }
            }
          }
        }
      }
      if (rebindsReceiver(node, receiver) && activeNames.has(root)) {
        foundRebinding = true;
      }
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const callee = node.expression;
        const carrierMethod = (ts.isPropertyAccessExpression(callee) ||
            ts.isElementAccessExpression(callee)) &&
          ts.isIdentifier(callee.expression) &&
          containers.has(callee.expression.text) &&
          aliasValue(containers.get(callee.expression.text)!, activeNames, containers);
        // Calling a method WITH a receiver-bearing carrier as "this"
        // may mutate the embedded receiver even if the method name/field
        // itself is not an alias. An unrelated field READ is different.
        if (carrierMethod ||
            aliasValue(callee, activeNames, containers) ||
            (node.arguments ?? []).some(arg =>
              aliasValue(arg, activeNames, containers))) {
          foundCall = true;
        }
      }
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
