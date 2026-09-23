import ts from "typescript";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type {
  ScriptApiReceiverType,
  ScriptMethodCall,
  ScriptMethodResultUse,
  ScriptPropertyAccess,
  ScriptPropertyWrite,
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
  "getComponent",
  "runCommandAsync",
  "isValid",
  "applyKnockback",
]);

const ENTITY_INHERITED_PROPERTIES = new Set([
  "dimension",
  "id",
  "isSneaking",
  "isValid",
  "location",
  "nameTag",
  "scoreboardIdentity",
  "typeId",
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

function minecraftSingletonBindings(
  file: ts.SourceFile,
): Map<string, ScriptApiReceiverType> {
  const output = new Map<string, ScriptApiReceiverType>([
    ["world", "World"],
    ["system", "System"],
  ]);

  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteralLike(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== "@minecraft/server"
    ) {
      continue;
    }

    const named = statement.importClause?.namedBindings;
    if (!named || !ts.isNamedImports(named)) continue;

    for (const element of named.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (importedName === "world") output.set(element.name.text, "World");
      if (importedName === "system") output.set(element.name.text, "System");
    }
  }

  return output;
}

function seedMinecraftSingletons(
  scope: Scope,
  bindings: ReadonlyMap<string, ScriptApiReceiverType>,
): void {
  for (const [localName, receiver] of bindings) {
    scope.values.set(localName, receiver);
  }
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
      name === "PlayerInputPermissions" ||
      name === "Block" ||
      name === "ItemStack" ||
      name === "BlockPermutation" ||
      name === "EntityFrictionModifierComponent" ||
      name === "EntityMarkVariantComponent" ||
      name === "EntityPushThroughComponent" ||
      name === "EntityScaleComponent" ||
      name === "EntitySkinIdComponent"
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
  if (receiver === "Block" && property === "permutation") return "BlockPermutation";
  if (receiver === "Player" && property === "inputPermissions") {
    return "PlayerInputPermissions";
  }
  return undefined;
}


function entityComponentType(
  call: ts.CallExpression,
): ScriptApiReceiverType | undefined {
  const argument = call.arguments[0];
  if (!argument || !ts.isStringLiteralLike(argument)) return undefined;

  switch (argument.text) {
    case "minecraft:friction_modifier":
      return "EntityFrictionModifierComponent";
    case "minecraft:mark_variant":
      return "EntityMarkVariantComponent";
    case "minecraft:push_through":
      return "EntityPushThroughComponent";
    case "minecraft:scale":
      return "EntityScaleComponent";
    case "minecraft:skin_id":
      return "EntitySkinIdComponent";
    default:
      return undefined;
  }
}

function methodReturnType(
  receiver: ScriptApiReceiverType,
  method: string,
  call?: ts.CallExpression,
): ReceiverValueType | undefined {
  if (
    call &&
    (receiver === "Entity" || receiver === "Player") &&
    method === "getComponent"
  ) {
    return entityComponentType(call);
  }
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

function isUndefinedLike(node: ts.Expression): boolean {
  return (
    node.kind === ts.SyntaxKind.NullKeyword ||
    (ts.isIdentifier(node) && node.text === "undefined")
  );
}

function isPositiveGuard(node: ts.Expression, name: string): boolean {
  if (ts.isIdentifier(node) && node.text === name) return true;
  if (ts.isParenthesizedExpression(node)) return isPositiveGuard(node.expression, name);
  if (
    ts.isBinaryExpression(node) &&
    ts.isIdentifier(node.left) &&
    node.left.text === name &&
    (
      node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
    ) &&
    isUndefinedLike(node.right)
  ) {
    return true;
  }
  return false;
}

function isNegativeGuard(node: ts.Expression, name: string): boolean {
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.ExclamationToken &&
    ts.isIdentifier(node.operand) &&
    node.operand.text === name
  ) {
    return true;
  }
  if (ts.isParenthesizedExpression(node)) return isNegativeGuard(node.expression, name);
  if (
    ts.isBinaryExpression(node) &&
    ts.isIdentifier(node.left) &&
    node.left.text === name &&
    (
      node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
    ) &&
    isUndefinedLike(node.right)
  ) {
    return true;
  }
  return false;
}

function statementTerminates(node: ts.Statement): boolean {
  if (ts.isReturnStatement(node) || ts.isThrowStatement(node)) return true;
  if (ts.isBlock(node)) {
    const last = node.statements.at(-1);
    return last ? statementTerminates(last) : false;
  }
  return false;
}

function identifierDereferenceState(
  node: ts.Node,
  name: string,
  guarded = false,
): { safe: boolean; risk: boolean } {
  let safe = false;
  let risk = false;

  const visit = (current: ts.Node, currentGuarded: boolean): void => {
    if (ts.isIfStatement(current) && isPositiveGuard(current.expression, name)) {
      visit(current.thenStatement, true);
      if (current.elseStatement) visit(current.elseStatement, currentGuarded);
      return;
    }

    if (
      ts.isPropertyAccessExpression(current) &&
      ts.isIdentifier(current.expression) &&
      current.expression.text === name
    ) {
      if (current.questionDotToken || currentGuarded) safe = true;
      else risk = true;
    }

    if (
      ts.isElementAccessExpression(current) &&
      ts.isIdentifier(current.expression) &&
      current.expression.text === name
    ) {
      if (current.questionDotToken || currentGuarded) safe = true;
      else risk = true;
    }

    ts.forEachChild(current, (child) => visit(child, currentGuarded));
  };

  visit(node, guarded);
  return { safe, risk };
}

function assignedResultUse(
  declaration: ts.VariableDeclaration,
): ScriptMethodResultUse {
  if (!ts.isIdentifier(declaration.name)) return "assigned";
  const name = declaration.name.text;
  const declarationList = declaration.parent;
  const statement = declarationList.parent;
  if (!ts.isVariableStatement(statement)) return "assigned";

  const container = statement.parent;
  const statements = ts.isBlock(container) || ts.isSourceFile(container)
    ? container.statements
    : undefined;
  if (!statements) return "assigned";

  const start = statements.indexOf(statement);
  if (start < 0) return "assigned";

  let guardedAfterEarlyExit = false;
  let safe = false;

  for (let index = start + 1; index < statements.length; index += 1) {
    const candidate = statements[index];
    if (!candidate) continue;

    if (
      ts.isExpressionStatement(candidate) &&
      ts.isBinaryExpression(candidate.expression) &&
      candidate.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(candidate.expression.left) &&
      candidate.expression.left.text === name
    ) {
      break;
    }

    if (
      ts.isIfStatement(candidate) &&
      isNegativeGuard(candidate.expression, name) &&
      statementTerminates(candidate.thenStatement)
    ) {
      guardedAfterEarlyExit = true;
      continue;
    }

    const state = identifierDereferenceState(
      candidate,
      name,
      guardedAfterEarlyExit,
    );
    if (state.risk) return "unguarded-assigned";
    if (state.safe) safe = true;
  }

  return safe ? "guarded-assigned" : "assigned";
}

function methodResultUse(call: ts.CallExpression): ScriptMethodResultUse {
  const parent = call.parent;

  if (ts.isPropertyAccessExpression(parent) && parent.expression === call) {
    return parent.questionDotToken ? "optional-dereferenced" : "dereferenced";
  }
  if (ts.isElementAccessExpression(parent) && parent.expression === call) {
    return parent.questionDotToken ? "optional-dereferenced" : "dereferenced";
  }
  if (ts.isNonNullExpression(parent)) return "non-null-asserted";
  if (ts.isVariableDeclaration(parent) && parent.initializer === call) {
    return assignedResultUse(parent);
  }
  if (ts.isReturnStatement(parent) && parent.expression === call) return "returned";
  if (ts.isExpressionStatement(parent)) return "ignored";
  return "other";
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
      return receiver ? methodReturnType(receiver, method, node) : undefined;
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
  seedMinecraftSingletons(root, minecraftSingletonBindings(file));

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
  const singletonBindings = minecraftSingletonBindings(file);
  const rootScope = childScope();
  seedMinecraftSingletons(rootScope, singletonBindings);

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
      singletonBindings.get(receiverExpression.text) === receiver;

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
      resultUse: methodResultUse(call),
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
  if (receiver === "Player" && ENTITY_INHERITED_PROPERTIES.has(property)) {
    return `Entity.${property}`;
  }
  return `${receiver}.${property}`;
}

export function inferScriptPropertyAccesses(
  file: ts.SourceFile,
  source: SourceRef,
): ScriptPropertyAccess[] {
  const accesses: ScriptPropertyAccess[] = [];
  const functionReturns = inferFunctionReturns(file);
  const singletonBindings = minecraftSingletonBindings(file);
  const rootScope = childScope();
  seedMinecraftSingletons(rootScope, singletonBindings);

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
      singletonBindings.get(receiverExpression.text) === receiver;

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

function canonicalPropertyWriteSymbol(
  receiver: ScriptApiReceiverType,
  property: string,
): string {
  if (receiver === "World") return `world.${property}`;
  if (receiver === "System") return `system.${property}`;
  if (receiver === "Player" && ENTITY_INHERITED_PROPERTIES.has(property)) {
    return `Entity.${property}`;
  }
  return `${receiver}.${property}`;
}

function assignmentOperation(kind: ts.SyntaxKind): ScriptPropertyWrite["operation"] | undefined {
  if (kind === ts.SyntaxKind.EqualsToken) return "assign";
  if (
    kind === ts.SyntaxKind.PlusEqualsToken ||
    kind === ts.SyntaxKind.MinusEqualsToken ||
    kind === ts.SyntaxKind.AsteriskEqualsToken ||
    kind === ts.SyntaxKind.SlashEqualsToken ||
    kind === ts.SyntaxKind.PercentEqualsToken
  ) {
    return "compound";
  }
  return undefined;
}

export function inferScriptPropertyWrites(
  file: ts.SourceFile,
  source: SourceRef,
): ScriptPropertyWrite[] {
  const writes: ScriptPropertyWrite[] = [];
  const functionReturns = inferFunctionReturns(file);
  const singletonBindings = minecraftSingletonBindings(file);
  const rootScope = childScope();
  seedMinecraftSingletons(rootScope, singletonBindings);

  const record = (
    access: ts.PropertyAccessExpression,
    operation: ScriptPropertyWrite["operation"],
    node: ts.Node,
    scope: Scope,
  ): void => {
    const receiver = receiverObject(
      inferExpressionType(access.expression, scope, functionReturns),
    );
    if (!receiver) return;

    const property = access.name.text;
    writes.push({
      receiverType: receiver,
      property,
      symbol: canonicalPropertyWriteSymbol(receiver, property),
      operation,
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

    if (ts.isBinaryExpression(node) && ts.isPropertyAccessExpression(node.left)) {
      const operation = assignmentOperation(node.operatorToken.kind);
      if (operation) record(node.left, operation, node, scope);
    }

    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken) &&
      ts.isPropertyAccessExpression(node.operand)
    ) {
      record(node.operand, "increment", node, scope);
    }

    ts.forEachChild(node, (child) => visit(child, scope));
  };

  visit(file, rootScope);

  const seen = new Set<string>();
  return writes.filter((write) => {
    const line = write.source.range?.lineStart ?? 0;
    const key = `${write.symbol}\0${line}\0${write.operation}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
