import ts from "typescript";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type {
  ScriptApiReceiverType,
  ScriptMethodCall,
  ScriptPropertyAccess,
} from "./types.js";
import type { ScriptArgumentKind } from "../../../packages/compatibility/src/script-signature-matrix.js";

type ReceiverValueType =
  | ScriptApiReceiverType
  | `${ScriptApiReceiverType}[]`;

interface Scope {
  values: Map<string, ReceiverValueType>;
  parent?: Scope;
}

const ARRAY_CALLBACK_METHODS = new Set([
  "every",
  "filter",
  "find",
  "forEach",
  "map",
  "some",
]);

const ENTITY_INHERITED_METHODS = new Set([
  "addTag",
  "getTags",
  "hasTag",
  "removeTag",
  "runCommandAsync",
  "isValid",
  "applyKnockback",
]);

function lineSource(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  source: SourceRef,
): SourceRef {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return {
    ...source,
    range: {
      lineStart: start.line + 1,
      lineEnd: end.line + 1,
    },
  };
}

function childScope(parent?: Scope): Scope {
  return parent
    ? { values: new Map<string, ReceiverValueType>(), parent }
    : { values: new Map<string, ReceiverValueType>() };
}

function lookup(scope: Scope, name: string): ReceiverValueType | undefined {
  let current: Scope | undefined = scope;
  while (current) {
    const value = current.values.get(name);
    if (value) return value;
    current = current.parent;
  }
  return undefined;
}

function receiverElement(
  type: ReceiverValueType | undefined,
): ScriptApiReceiverType | undefined {
  if (!type?.endsWith("[]")) return undefined;
  return type.slice(0, -2) as ScriptApiReceiverType;
}

function receiverObject(
  type: ReceiverValueType | undefined,
): ScriptApiReceiverType | undefined {
  return type && !type.endsWith("[]")
    ? type as ScriptApiReceiverType
    : undefined;
}

function typeFromAnnotation(
  node: ts.TypeNode | undefined,
): ReceiverValueType | undefined {
  if (!node) return undefined;
  if (ts.isArrayTypeNode(node)) {
    const element = typeFromAnnotation(node.elementType);
    return element && !element.endsWith("[]")
      ? `${element}[]` as ReceiverValueType
      : undefined;
  }
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    const name = node.typeName.text as ScriptApiReceiverType;
    if (
      name === "World" ||
      name === "System" ||
      name === "Player" ||
      name === "Entity" ||
      name === "Dimension" ||
      name === "Scoreboard" ||
      name === "ScoreboardObjective" ||
      name === "PlayerInputPermissions"
    ) {
      return name;
    }
  }
  return undefined;
}

function propertyType(
  receiver: ScriptApiReceiverType,
  property: string,
): ReceiverValueType | undefined {
  if (receiver === "World" && property === "scoreboard") return "Scoreboard";
  if (receiver === "Player" && property === "inputPermissions") {
    return "PlayerInputPermissions";
  }
  return undefined;
}

function methodReturnType(
  receiver: ScriptApiReceiverType,
  method: string,
): ReceiverValueType | undefined {
  if (receiver === "World" && method === "getAllPlayers") return "Player[]";
  if (receiver === "World" && method === "getPlayers") return "Player[]";
  if (receiver === "World" && method === "getDimension") return "Dimension";
  if (receiver === "Dimension" && method === "getEntities") return "Entity[]";
  if (receiver === "Dimension" && method === "getPlayers") return "Player[]";
  if (receiver === "Scoreboard" && method === "getObjective") {
    return "ScoreboardObjective";
  }
  return undefined;
}

function argumentKind(node: ts.Expression): ScriptArgumentKind {
  if (ts.isNumericLiteral(node)) return "number";
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return "string";
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) {
    return "boolean";
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) return "null";
  if (ts.isObjectLiteralExpression(node)) return "object";
  if (ts.isArrayLiteralExpression(node)) return "array";
  if (ts.isIdentifier(node)) return "identifier";
  if (ts.isCallExpression(node)) return "call";
  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
    return "property";
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return "function";
  if (ts.isSpreadElement(node)) return "spread";
  return "other";
}

function canonicalMethodSymbol(
  receiver: ScriptApiReceiverType,
  method: string,
): string {
  if (receiver === "World") return `world.${method}`;
  if (receiver === "System") return `system.${method}`;
  if (receiver === "Player" && ENTITY_INHERITED_METHODS.has(method)) {
    return `Entity.${method}`;
  }
  return `${receiver}.${method}`;
}

function inferExpressionType(
  node: ts.Expression,
  scope: Scope,
  functionReturns: ReadonlyMap<string, ReceiverValueType>,
): ReceiverValueType | undefined {
  if (ts.isIdentifier(node)) {
    if (node.text === "world") return "World";
    if (node.text === "system") return "System";
    return lookup(scope, node.text);
  }

  if (ts.isPropertyAccessExpression(node)) {
    const receiver = receiverObject(
      inferExpressionType(node.expression, scope, functionReturns),
    );
    return receiver ? propertyType(receiver, node.name.text) : undefined;
  }

  if (ts.isElementAccessExpression(node)) {
    return receiverElement(
      inferExpressionType(node.expression, scope, functionReturns),
    );
  }

  if (ts.isCallExpression(node)) {
    if (ts.isIdentifier(node.expression)) {
      return functionReturns.get(node.expression.text);
    }

    if (ts.isPropertyAccessExpression(node.expression)) {
      const receiverType = inferExpressionType(
        node.expression.expression,
        scope,
        functionReturns,
      );
      const elementType = receiverElement(receiverType);
      const method = node.expression.name.text;
      if (elementType) {
        if (method === "find") return elementType;
        if (method === "filter") return `${elementType}[]`;
        return undefined;
      }

      const receiver = receiverObject(receiverType);
      return receiver ? methodReturnType(receiver, method) : undefined;
    }
  }

  if (ts.isParenthesizedExpression(node)) {
    return inferExpressionType(node.expression, scope, functionReturns);
  }

  return undefined;
}

function firstReturnExpression(
  fn: ts.FunctionDeclaration,
): ts.Expression | undefined {
  if (!fn.body) return undefined;
  const returns = fn.body.statements.filter(ts.isReturnStatement);
  if (returns.length !== 1) return undefined;
  return returns[0]?.expression;
}

function inferFunctionReturns(
  file: ts.SourceFile,
): Map<string, ReceiverValueType> {
  const output = new Map<string, ReceiverValueType>();
  const root = childScope();

  for (const statement of file.statements) {
    if (!ts.isFunctionDeclaration(statement) || !statement.name) continue;
    const expression = firstReturnExpression(statement);
    if (!expression) continue;
    const type = inferExpressionType(expression, root, output);
    if (type) output.set(statement.name.text, type);
  }

  return output;
}

export function inferScriptMethodCalls(
  file: ts.SourceFile,
  source: SourceRef,
): ScriptMethodCall[] {
  const calls: ScriptMethodCall[] = [];
  const functionReturns = inferFunctionReturns(file);
  const rootScope = childScope();

  const recordCall = (
    call: ts.CallExpression,
    scope: Scope,
  ): void => {
    if (!ts.isPropertyAccessExpression(call.expression)) return;
    const receiverExpression = call.expression.expression;
    const receiver = receiverObject(
      inferExpressionType(receiverExpression, scope, functionReturns),
    );
    if (!receiver) return;

    const method = call.expression.name.text;
    const direct =
      ts.isIdentifier(receiverExpression) &&
      ((receiverExpression.text === "world" && receiver === "World") ||
        (receiverExpression.text === "system" && receiver === "System"));

    calls.push({
      receiverType: receiver,
      ...(direct
        ? { root: receiver === "World" ? "world" as const : "system" as const }
        : {}),
      method,
      symbol: canonicalMethodSymbol(receiver, method),
      inference: direct ? "direct" : "bounded",
      argumentCount: call.arguments.length,
      argumentKinds: call.arguments.map((argument) => argumentKind(argument)),
      hasSpreadArgument: call.arguments.some(ts.isSpreadElement),
      source: lineSource(file, call, source),
    });
  };

  const visit = (node: ts.Node, scope: Scope): void => {
    if (ts.isFunctionDeclaration(node)) {
      const fnScope = childScope(scope);
      for (const parameter of node.parameters) {
        if (!ts.isIdentifier(parameter.name)) continue;
        const type = typeFromAnnotation(parameter.type);
        if (type) fnScope.values.set(parameter.name.text, type);
      }
      if (node.body) visit(node.body, fnScope);
      return;
    }

    if (ts.isBlock(node)) {
      const blockScope = childScope(scope);
      for (const statement of node.statements) visit(statement, blockScope);
      return;
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const explicit = typeFromAnnotation(node.type);
      const inferred = node.initializer
        ? inferExpressionType(node.initializer, scope, functionReturns)
        : undefined;
      const type = explicit ?? inferred;
      if (type) scope.values.set(node.name.text, type);
      if (node.initializer) visit(node.initializer, scope);
      return;
    }

    if (ts.isForOfStatement(node)) {
      visit(node.expression, scope);
      const element = receiverElement(
        inferExpressionType(node.expression, scope, functionReturns),
      );
      const loopScope = childScope(scope);
      const declaration = node.initializer;
      if (
        element &&
        ts.isVariableDeclarationList(declaration) &&
        declaration.declarations.length === 1
      ) {
        const item = declaration.declarations[0];
        if (item && ts.isIdentifier(item.name)) {
          loopScope.values.set(item.name.text, element);
        }
      }
      visit(node.statement, loopScope);
      return;
    }

    if (ts.isCallExpression(node)) {
      recordCall(node, scope);

      if (ts.isPropertyAccessExpression(node.expression)) {
        const receiverType = inferExpressionType(
          node.expression.expression,
          scope,
          functionReturns,
        );
        const element = receiverElement(receiverType);
        const method = node.expression.name.text;
        const callback = node.arguments[0];

        visit(node.expression, scope);

        if (
          element &&
          ARRAY_CALLBACK_METHODS.has(method) &&
          callback &&
          (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
        ) {
          const callbackScope = childScope(scope);
          const parameter = callback.parameters[0];
          if (parameter && ts.isIdentifier(parameter.name)) {
            callbackScope.values.set(parameter.name.text, element);
          }
          visit(callback.body, callbackScope);
          for (let index = 1; index < node.arguments.length; index += 1) {
            const argument = node.arguments[index];
            if (argument) visit(argument, scope);
          }
          return;
        }
      }
    }

    ts.forEachChild(node, (child) => visit(child, scope));
  };

  visit(file, rootScope);

  const seen = new Set<string>();
  return calls.filter((call) => {
    const line = call.source.range?.lineStart ?? 0;
    const key = `${call.symbol}\0${line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function canonicalPropertySymbol(
  receiver: ScriptApiReceiverType,
  property: string,
): string {
  if (receiver === "World") return `world.${property}`;
  if (receiver === "System") return `system.${property}`;
  return `${receiver}.${property}`;
}

export function inferScriptPropertyAccesses(
  file: ts.SourceFile,
  source: SourceRef,
): ScriptPropertyAccess[] {
  const accesses: ScriptPropertyAccess[] = [];
  const functionReturns = inferFunctionReturns(file);
  const rootScope = childScope();

  const recordProperty = (
    node: ts.PropertyAccessExpression,
    scope: Scope,
  ): void => {
    if (ts.isCallExpression(node.parent) && node.parent.expression === node) {
      return;
    }

    const receiverExpression = node.expression;
    const receiver = receiverObject(
      inferExpressionType(receiverExpression, scope, functionReturns),
    );
    if (!receiver) return;

    const property = node.name.text;
    if (
      (receiver === "World" || receiver === "System") &&
      (property === "beforeEvents" || property === "afterEvents")
    ) {
      return;
    }

    const direct =
      ts.isIdentifier(receiverExpression) &&
      ((receiverExpression.text === "world" && receiver === "World") ||
        (receiverExpression.text === "system" && receiver === "System"));

    accesses.push({
      receiverType: receiver,
      ...(direct
        ? { root: receiver === "World" ? "world" as const : "system" as const }
        : {}),
      property,
      symbol: canonicalPropertySymbol(receiver, property),
      inference: direct ? "direct" : "bounded",
      source: lineSource(file, node, source),
    });
  };

  const visit = (node: ts.Node, scope: Scope): void => {
    if (ts.isFunctionDeclaration(node)) {
      const fnScope = childScope(scope);
      for (const parameter of node.parameters) {
        if (!ts.isIdentifier(parameter.name)) continue;
        const type = typeFromAnnotation(parameter.type);
        if (type) fnScope.values.set(parameter.name.text, type);
      }
      if (node.body) visit(node.body, fnScope);
      return;
    }

    if (ts.isBlock(node)) {
      const blockScope = childScope(scope);
      for (const statement of node.statements) visit(statement, blockScope);
      return;
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const explicit = typeFromAnnotation(node.type);
      const inferred = node.initializer
        ? inferExpressionType(node.initializer, scope, functionReturns)
        : undefined;
      const type = explicit ?? inferred;
      if (type) scope.values.set(node.name.text, type);
      if (node.initializer) visit(node.initializer, scope);
      return;
    }

    if (ts.isForOfStatement(node)) {
      visit(node.expression, scope);
      const element = receiverElement(
        inferExpressionType(node.expression, scope, functionReturns),
      );
      const loopScope = childScope(scope);
      const declaration = node.initializer;
      if (
        element &&
        ts.isVariableDeclarationList(declaration) &&
        declaration.declarations.length === 1
      ) {
        const item = declaration.declarations[0];
        if (item && ts.isIdentifier(item.name)) {
          loopScope.values.set(item.name.text, element);
        }
      }
      visit(node.statement, loopScope);
      return;
    }

    if (ts.isPropertyAccessExpression(node)) {
      recordProperty(node, scope);
    }

    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const receiverType = inferExpressionType(
        node.expression.expression,
        scope,
        functionReturns,
      );
      const element = receiverElement(receiverType);
      const method = node.expression.name.text;
      const callback = node.arguments[0];

      visit(node.expression, scope);

      if (
        element &&
        ARRAY_CALLBACK_METHODS.has(method) &&
        callback &&
        (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
      ) {
        const callbackScope = childScope(scope);
        const parameter = callback.parameters[0];
        if (parameter && ts.isIdentifier(parameter.name)) {
          callbackScope.values.set(parameter.name.text, element);
        }
        visit(callback.body, callbackScope);
        for (let index = 1; index < node.arguments.length; index += 1) {
          const argument = node.arguments[index];
          if (argument) visit(argument, scope);
        }
        return;
      }
    }

    ts.forEachChild(node, (child) => visit(child, scope));
  };

  visit(file, rootScope);

  const seen = new Set<string>();
  return accesses.filter((access) => {
    const line = access.source.range?.lineStart ?? 0;
    const key = `${access.symbol}\0${line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
