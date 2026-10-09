import ts from "typescript";

export const SCRIPT_PARSER_REVISION =
  "m-bedrock-script-parser:1:typescript:" +
  ts.version;
import type { SourceRef } from "../../../../packages/project-model/src/index.js";
import type {
  DynamicPropertyAccess,
  ParsedScriptFile,
  RestrictedExecutionMutation,
  ScriptCapabilityUse,
  ScriptEventSubscription,
  ScriptEntityEventTrigger,
  ScriptDeferredCallback,
  ScriptLocalFunctionCall,
  ScriptBlockMatchGuard,
  ScriptCommandLiteral,
  ScriptImport,
  ScriptImportedSymbol,
  ScriptModuleMemberAccess,
  ScriptEnumValueComparison,
  ScriptStateMutation,
  ScriptTransitionDeclaration,
  ScriptTypeProperty,
  ScriptReturnOutcome,
  ScriptGuardedOutcome,
  ScriptGuardOperand,
  ScriptGuardPredicate,
  ScriptDeclaredMember,
  ScriptSpatialRoutePoint,
  ScriptSpatialOffsetTransform,
  ScriptSpatialTransformUse,
  ScriptSpatialContextOffsetSeries,
} from "../core/types.js";
import {
  inferScriptMethodCalls,
  inferScriptPropertyAccesses,
  inferScriptPropertyWrites,
} from "./receiver-inference.js";
import { findScriptExecutionPrivilegeRule } from "../../../../packages/compatibility/src/index.js";
import { inferScriptLifecycleMemberExposures } from "../domains/lifecycle/lifecycle-exposure.js";
import {
  deriveCapturedGenerationGuardTransformHints,
  derivePersistenceIdempotencyGuardTransformHints,
} from "../repair/repair-transform-hints.js";
import {
  deriveArenaCapacityGuardTransformHints,
  deriveArenaStartOwnershipGuardTransformHints,
} from "../domains/arena/arena-repair-transform-hints.js";
import {
  correlateScriptArenaAuthorityPaths,
  deriveScriptArenaAuthorityEvidence,
} from "../domains/arena/arena-authority-evidence.js";
import {
  derivePersistenceIdempotencyGuards,
} from "../domains/persistence/persistence-idempotency-evidence.js";
import { compileScriptSafeConfig } from "../config/safe-config-compiler.js";
import { deriveScriptSpatialWorldMutations } from "../domains/spatial/spatial-world-mutation.js";
import { deriveScriptSpatialMutations } from "../domains/spatial/spatial-mutation-evidence.js";
import { deriveScriptCleanupResourceEvidence } from "../domains/cleanup/cleanup-resource-evidence.js";
import { deriveScriptCombatLifecycleEvidence } from "../domains/combat/combat-lifecycle-evidence.js";
import { deriveScriptChunkLifecycleEvidence } from "../domains/chunk/chunk-lifecycle-evidence.js";
import { deriveScriptEconomyEvidence } from "../domains/economy/economy-evidence.js";
import {
  deriveScriptProgressionActorRegistryEvidence,
  deriveScriptProgressionActorSpawnEvidence,
  deriveScriptProgressionCounterEvidence,
} from "../domains/progression/progression-counter-evidence.js";
import { deriveScriptInventoryLifecycleEvidence } from "../domains/inventory/inventory-lifecycle-evidence.js";
import { deriveScriptGlobalLeaseEvidence } from "../domains/arena/global-lease-evidence.js";
import {
  derivePersistentDataLifecycleEvidence,
  deriveResultAuditRecordEvidence,
} from "../domains/persistence/persistent-data-lifecycle.js";
import { inferPersistentStateScopes } from "../domains/persistence/persistent-state-scope.js";
import { inferPersistentStateLifetimes } from "../domains/persistence/persistent-state-lifetime.js";
import { deriveBlockCustomComponentRegistrations } from "../domains/automation/block-custom-component-evidence.js";
import { derivePersistentReconciliationEvidence } from "../domains/persistence/persistent-reconciliation.js";

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".ts")) return ts.ScriptKind.TS;
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function lineSource(sourceFile: ts.SourceFile, node: ts.Node, source: SourceRef): SourceRef {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
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

function importBindings(node: ts.ImportDeclaration): string[] {
  const clause = node.importClause;
  if (!clause) return [];

  const bindings: string[] = [];
  if (clause.name) bindings.push(clause.name.text);

  const named = clause.namedBindings;
  if (named && ts.isNamespaceImport(named)) {
    bindings.push(named.name.text);
  } else if (named && ts.isNamedImports(named)) {
    for (const element of named.elements) bindings.push(element.name.text);
  }

  return bindings;
}


function minecraftNamedBindings(file: ts.SourceFile): Map<string, {
  module: string;
  importedName: string;
}> {
  const output = new Map<string, { module: string; importedName: string }>();

  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteralLike(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== "@minecraft/server"
    ) {
      continue;
    }

    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;

    for (const element of bindings.elements) {
      output.set(element.name.text, {
        module: "@minecraft/server",
        importedName: element.propertyName?.text ?? element.name.text,
      });
    }
  }

  return output;
}


function minecraftNamespaceBindings(file: ts.SourceFile): Map<string, string> {
  const output = new Map<string, string>();

  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteralLike(statement.moduleSpecifier)
    ) {
      continue;
    }

    const module = statement.moduleSpecifier.text;
    if (!module.startsWith("@minecraft/")) continue;

    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
      output.set(bindings.name.text, module);
    }
  }

  return output;
}

function qualifiedNameChain(node: ts.EntityName): string[] {
  if (ts.isIdentifier(node)) return [node.text];
  return [...qualifiedNameChain(node.left), node.right.text];
}

function classifyModule(module: string): ScriptImport["kind"] {
  if (module.startsWith("@minecraft/")) return "minecraft";
  if (module.startsWith(".") || module.startsWith("/")) return "relative";
  return "external";
}

function propertyAccessChain(node: ts.Expression): string[] {
  const names: string[] = [];
  let current: ts.Expression = node;

  while (ts.isPropertyAccessExpression(current)) {
    names.unshift(current.name.text);
    current = current.expression;
  }

  if (ts.isIdentifier(current)) names.unshift(current.text);
  return names;
}

function runCommandStringContext(
  node: ts.StringLiteralLike,
  file: ts.SourceFile,
): {
  mechanism: "runCommand" | "runCommandAsync";
  executionRegion: string;
  receiverHint: string;
} | undefined {
  const parent = node.parent;
  if (!ts.isCallExpression(parent) || parent.arguments[0] !== node) {
    return undefined;
  }
  if (!ts.isPropertyAccessExpression(parent.expression)) return undefined;
  const method = parent.expression.name.text;
  if (method !== "runCommand" && method !== "runCommandAsync") {
    return undefined;
  }
  return {
    mechanism: method,
    executionRegion: localExecutionRegionId(parent, file),
    receiverHint: parent.expression.expression.getText(file),
  };
}

function stringArgument(node: ts.CallExpression, index = 0): string | undefined {
  const arg = node.arguments[index];
  return arg && ts.isStringLiteralLike(arg) ? arg.text : undefined;
}

function dynamicPropertyOperation(name: string): DynamicPropertyAccess["operation"] {
  if (name === "getDynamicProperty") return "get";
  if (name === "setDynamicProperty") return "set";
  if (name === "clearDynamicProperties") return "clear";
  if (name === "getDynamicPropertyIds") return "ids";
  if (name === "getDynamicPropertyTotalByteCount") return "size";
  return "unknown";
}

function callbackNode(call: ts.CallExpression): ts.Node | undefined {
  const candidate = call.arguments[0];
  if (
    candidate &&
    (ts.isArrowFunction(candidate) || ts.isFunctionExpression(candidate))
  ) {
    return candidate;
  }
  return undefined;
}

const GENERATION_GUARD_PATTERN =
  /(?:generation|epoch|revision|rev|token|operationId|sessionId|roundId|lifeId|entityId)/i;

function deferredScheduler(
  call: ts.CallExpression,
  namedBindings: ReadonlyMap<string, { module: string; importedName: string }>,
): ScriptDeferredCallback["scheduler"] | undefined {
  if (!ts.isPropertyAccessExpression(call.expression)) return undefined;
  const chain = propertyAccessChain(call.expression);
  if (chain.length !== 2) return undefined;

  const root = chain[0];
  const method = chain[1];
  const binding = root ? namedBindings.get(root) : undefined;
  const canonicalRoot = binding?.importedName ?? root;
  if (canonicalRoot !== "system") return undefined;

  if (
    method === "run" ||
    method === "runTimeout" ||
    method === "runInterval" ||
    method === "runJob"
  ) {
    return method;
  }
  return undefined;
}

function generationGuardIdentifiers(node: ts.Node): string[] {
  const identifiers = new Set<string>();

  const collectGuardNames = (candidate: ts.Node): string[] => {
    const names = new Set<string>();
    const visit = (inner: ts.Node): void => {
      if (ts.isIdentifier(inner) && GENERATION_GUARD_PATTERN.test(inner.text)) {
        names.add(inner.text);
      }
      if (
        ts.isPropertyAccessExpression(inner) &&
        GENERATION_GUARD_PATTERN.test(inner.name.text)
      ) {
        names.add(inner.name.text);
      }
      ts.forEachChild(inner, visit);
    };
    visit(candidate);
    return [...names];
  };

  const visit = (inner: ts.Node): void => {
    if (ts.isBinaryExpression(inner)) {
      const comparison = new Set([
        ts.SyntaxKind.EqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ts.SyntaxKind.LessThanToken,
        ts.SyntaxKind.LessThanEqualsToken,
        ts.SyntaxKind.GreaterThanToken,
        ts.SyntaxKind.GreaterThanEqualsToken,
      ]);
      if (comparison.has(inner.operatorToken.kind)) {
        for (const name of collectGuardNames(inner)) identifiers.add(name);
      }
    }
    ts.forEachChild(inner, visit);
  };

  visit(node);
  return [...identifiers].sort();
}

function enclosingClassLike(
  node: ts.Node,
): ts.ClassDeclaration | ts.ClassExpression | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      ts.isClassDeclaration(current) ||
      ts.isClassExpression(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

function directThisMethodTarget(
  call: ts.CallExpression,
): string | undefined {
  if (!ts.isPropertyAccessExpression(call.expression)) {
    return undefined;
  }
  if (call.expression.expression.kind !== ts.SyntaxKind.ThisKeyword) {
    return undefined;
  }

  const methodName = call.expression.name.text;
  const container = enclosingClassLike(call);
  if (!container) return undefined;

  const declared = container.members.some((member) => {
    if (!ts.isMethodDeclaration(member)) return false;
    return declarationMemberName(member.name) === methodName;
  });

  return declared ? methodName : undefined;
}

function statementMayExitFunction(
  node: ts.Node,
): boolean {
  if (
    ts.isReturnStatement(node) ||
    ts.isThrowStatement(node)
  ) {
    return true;
  }

  if (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node)
  ) {
    return false;
  }

  let found = false;
  ts.forEachChild(node, (child) => {
    if (!found && statementMayExitFunction(child)) {
      found = true;
    }
  });
  return found;
}

function hasPriorPossibleFunctionExit(
  node: ts.Node,
): boolean {
  let current: ts.Node | undefined = node;

  while (current?.parent) {
    const parent = current.parent;

    if (
      ts.isBlock(parent) &&
      ts.isStatement(current)
    ) {
      const index =
        parent.statements.indexOf(current);
      if (index > 0) {
        for (
          const previous of
            parent.statements.slice(0, index)
        ) {
          if (
            statementMayExitFunction(
              previous,
            )
          ) {
            return true;
          }
        }
      }
    }

    if (
      ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isArrowFunction(parent) ||
      ts.isMethodDeclaration(parent)
    ) {
      break;
    }

    current = parent;
  }

  return false;
}

function localCallControlFlow(
  node: ts.Node,
): "unconditional" | "conditional" | "deferred" {
  if (hasPriorPossibleFunctionExit(node)) {
    return "conditional";
  }

  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      ts.isIfStatement(current) ||
      ts.isConditionalExpression(current) ||
      ts.isCaseClause(current) ||
      ts.isDefaultClause(current)
    ) {
      return "conditional";
    }

    if (
      ts.isArrowFunction(current) ||
      ts.isFunctionExpression(current)
    ) {
      const parent = current.parent;
      if (
        ts.isCallExpression(parent) &&
        parent.arguments.includes(current) &&
        ts.isPropertyAccessExpression(parent.expression) &&
        /^(?:run|runTimeout|runInterval|runJob)$/.test(
          parent.expression.name.text,
        )
      ) {
        return "deferred";
      }
      return "unconditional";
    }

    if (
      ts.isFunctionDeclaration(current) ||
      ts.isMethodDeclaration(current)
    ) {
      return "unconditional";
    }

    current = current.parent;
  }
  return "unconditional";
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
      const name = declarationMemberName(current.name);
      if (name) return "function:" + name;
    }
    if (
      ts.isArrowFunction(current) ||
      ts.isFunctionExpression(current)
    ) {
      const start = file.getLineAndCharacterOfPosition(current.getStart(file));
      return "callback@" + (start.line + 1) + ":" + (start.character + 1);
    }
    current = current.parent;
  }
  return "module";
}

function callbackExecutionRegionId(
  node: ts.Node,
  file: ts.SourceFile,
): string {
  const start = file.getLineAndCharacterOfPosition(node.getStart(file));
  return "callback@" + (start.line + 1) + ":" + (start.character + 1);
}

function directReturnStatements(
  statement: ts.Statement,
): ts.ReturnStatement[] {
  if (ts.isReturnStatement(statement)) return [statement];
  if (!ts.isBlock(statement)) return [];
  return statement.statements.filter(ts.isReturnStatement);
}

function outcomePropertiesFromReturn(
  node: ts.ReturnStatement,
): Array<{ propertyName: string; value: string; sourceNode: ts.Node }> {
  const expression = node.expression &&
    (ts.isParenthesizedExpression(node.expression)
      ? node.expression.expression
      : node.expression);
  if (!expression || !ts.isObjectLiteralExpression(expression)) return [];

  const output: Array<{
    propertyName: string;
    value: string;
    sourceNode: ts.Node;
  }> = [];

  for (const property of expression.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const propertyName =
      ts.isIdentifier(property.name) ||
      ts.isStringLiteralLike(property.name)
        ? property.name.text
        : undefined;
    if (!propertyName) continue;

    const initializer = property.initializer;
    const value =
      ts.isStringLiteralLike(initializer) ||
      ts.isNoSubstitutionTemplateLiteral(initializer)
        ? initializer.text
        : undefined;
    if (value === undefined) continue;

    output.push({
      propertyName,
      value,
      sourceNode: property,
    });
  }

  return output;
}

function declarationMemberName(
  node: ts.PropertyName | undefined,
): string | undefined {
  if (!node) return undefined;
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) {
    return node.text;
  }
  return undefined;
}

function declarationContainerHint(
  node: ts.Node,
): string | undefined {
  const parent = node.parent;
  if (
    parent &&
    (ts.isClassDeclaration(parent) ||
      ts.isClassExpression(parent)) &&
    parent.name
  ) {
    return parent.name.text;
  }
  return undefined;
}

function numericLiteralValue(
  expression: ts.Expression,
): number | undefined {
  const value =
    ts.isParenthesizedExpression(expression)
      ? expression.expression
      : expression;

  if (ts.isNumericLiteral(value)) {
    const parsed = Number(value.text);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  if (
    ts.isPrefixUnaryExpression(value) &&
    (
      value.operator === ts.SyntaxKind.MinusToken ||
      value.operator === ts.SyntaxKind.PlusToken
    ) &&
    ts.isNumericLiteral(value.operand)
  ) {
    const parsed = Number(value.operand.text);
    if (!Number.isFinite(parsed)) return undefined;
    return value.operator === ts.SyntaxKind.MinusToken
      ? -parsed
      : parsed;
  }

  return undefined;
}

function objectPropertyAssignment(
  object: ts.ObjectLiteralExpression,
  names: readonly string[],
): ts.PropertyAssignment | undefined {
  const allowed = new Set(names);
  return object.properties.find((property) => {
    if (!ts.isPropertyAssignment(property)) return false;
    const name = declarationMemberName(property.name);
    return name !== undefined && allowed.has(name);
  }) as ts.PropertyAssignment | undefined;
}

function spatialRouteCollectionHint(
  node: ts.ObjectLiteralExpression,
): string | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isVariableDeclaration(current)) {
      return ts.isIdentifier(current.name)
        ? current.name.text
        : undefined;
    }
    if (ts.isPropertyAssignment(current)) {
      return declarationMemberName(current.name);
    }
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current) ||
      ts.isSourceFile(current)
    ) {
      break;
    }
    current = current.parent;
  }
  return undefined;
}

function spatialRoutePointFromObject(
  node: ts.ObjectLiteralExpression,
  file: ts.SourceFile,
  source: SourceRef,
): ScriptSpatialRoutePoint | undefined {
  const routeProperty = objectPropertyAssignment(
    node,
    ["route", "routeId", "lane", "pathRoute"],
  );
  if (
    !routeProperty ||
    !ts.isStringLiteralLike(routeProperty.initializer)
  ) {
    return undefined;
  }

  const locationProperty = objectPropertyAssignment(
    node,
    ["location", "position", "point"],
  );
  if (
    !locationProperty ||
    !ts.isObjectLiteralExpression(
      locationProperty.initializer,
    )
  ) {
    return undefined;
  }

  const location = locationProperty.initializer;
  const xProperty = objectPropertyAssignment(location, ["x"]);
  const yProperty = objectPropertyAssignment(location, ["y"]);
  const zProperty = objectPropertyAssignment(location, ["z"]);
  if (!xProperty || !yProperty || !zProperty) {
    return undefined;
  }

  const x = numericLiteralValue(xProperty.initializer);
  const y = numericLiteralValue(yProperty.initializer);
  const z = numericLiteralValue(zProperty.initializer);
  if (x === undefined || y === undefined || z === undefined) {
    return undefined;
  }

  const indexProperty = objectPropertyAssignment(
    node,
    ["pathIndex", "index", "order", "sequence"],
  );
  const index = indexProperty
    ? numericLiteralValue(indexProperty.initializer)
    : undefined;
  const collectionHint = spatialRouteCollectionHint(node);

  return {
    routeId: routeProperty.initializer.text,
    location: { x, y, z },
    ...(index === undefined ? {} : { index }),
    ...(collectionHint === undefined
      ? {}
      : { collectionHint }),
    source: lineSource(file, node, source),
  };
}

function spatialOffsetTransformFromFunction(
  node: ts.FunctionDeclaration,
  file: ts.SourceFile,
  source: SourceRef,
): ScriptSpatialOffsetTransform | undefined {
  if (!node.name || !node.body || node.parameters.length < 2) {
    return undefined;
  }

  const pointParameterNode = node.parameters[0]?.name;
  const contextParameterNode = node.parameters[1]?.name;
  if (
    !pointParameterNode ||
    !contextParameterNode ||
    !ts.isIdentifier(pointParameterNode) ||
    !ts.isIdentifier(contextParameterNode)
  ) {
    return undefined;
  }

  const returnStatement = node.body.statements.find(
    ts.isReturnStatement,
  );
  const returned = returnStatement?.expression;
  if (!returned || !ts.isObjectLiteralExpression(returned)) {
    return undefined;
  }

  const pointParameter = pointParameterNode.text;
  const contextParameter = contextParameterNode.text;
  let offsetPath: string | undefined;

  const axisMatches = (axis: "x" | "y" | "z"): boolean => {
    const property = objectPropertyAssignment(returned, [axis]);
    if (!property || !ts.isBinaryExpression(property.initializer)) {
      return false;
    }
    if (
      property.initializer.operatorToken.kind !==
      ts.SyntaxKind.PlusToken
    ) {
      return false;
    }

    const matchesPair = (
      pointSide: ts.Expression,
      offsetSide: ts.Expression,
    ): boolean => {
      if (
        !ts.isPropertyAccessExpression(pointSide) ||
        pointSide.name.text !== axis ||
        !ts.isIdentifier(pointSide.expression) ||
        pointSide.expression.text !== pointParameter
      ) {
        return false;
      }

      const chain = propertyAccessChain(offsetSide);
      if (
        chain.length !== 3 ||
        chain[0] !== contextParameter ||
        chain[2] !== axis
      ) {
        return false;
      }

      const candidateOffsetPath = chain[1];
      if (!candidateOffsetPath) return false;
      if (
        offsetPath !== undefined &&
        offsetPath !== candidateOffsetPath
      ) {
        return false;
      }
      offsetPath = candidateOffsetPath;
      return true;
    };

    return (
      matchesPair(
        property.initializer.left,
        property.initializer.right,
      ) ||
      matchesPair(
        property.initializer.right,
        property.initializer.left,
      )
    );
  };

  if (
    !axisMatches("x") ||
    !axisMatches("y") ||
    !axisMatches("z") ||
    offsetPath === undefined
  ) {
    return undefined;
  }

  return {
    functionName: node.name.text,
    pointParameter,
    contextParameter,
    offsetPath,
    source: lineSource(file, node, source),
  };
}

function spatialOffsetTransformsFromFile(
  file: ts.SourceFile,
  source: SourceRef,
): ScriptSpatialOffsetTransform[] {
  const output: ScriptSpatialOffsetTransform[] = [];
  for (const statement of file.statements) {
    if (!ts.isFunctionDeclaration(statement)) continue;
    const transform = spatialOffsetTransformFromFunction(
      statement,
      file,
      source,
    );
    if (transform) output.push(transform);
  }
  return output;
}

interface AffineScalar {
  base: number;
  stride: number;
}

function affineExpression(
  expression: ts.Expression,
  file: ts.SourceFile,
  values: ReadonlyMap<string, AffineScalar>,
  constants: ReadonlyMap<string, number>,
): AffineScalar | undefined {
  const value =
    ts.isParenthesizedExpression(expression)
      ? expression.expression
      : expression;

  const numeric = numericLiteralValue(value);
  if (numeric !== undefined) {
    return { base: numeric, stride: 0 };
  }

  if (ts.isIdentifier(value)) {
    const local = values.get(value.text);
    if (local) return local;
    const constant = constants.get(value.text);
    return constant === undefined
      ? undefined
      : { base: constant, stride: 0 };
  }

  if (!ts.isBinaryExpression(value)) return undefined;

  const left = affineExpression(
    value.left,
    file,
    values,
    constants,
  );
  const right = affineExpression(
    value.right,
    file,
    values,
    constants,
  );
  if (!left || !right) return undefined;

  switch (value.operatorToken.kind) {
    case ts.SyntaxKind.PlusToken:
      return {
        base: left.base + right.base,
        stride: left.stride + right.stride,
      };
    case ts.SyntaxKind.MinusToken:
      return {
        base: left.base - right.base,
        stride: left.stride - right.stride,
      };
    case ts.SyntaxKind.AsteriskToken:
      if (left.stride === 0) {
        return {
          base: left.base * right.base,
          stride: left.base * right.stride,
        };
      }
      if (right.stride === 0) {
        return {
          base: right.base * left.base,
          stride: right.base * left.stride,
        };
      }
      return undefined;
    case ts.SyntaxKind.SlashToken:
      if (right.stride !== 0 || right.base === 0) {
        return undefined;
      }
      return {
        base: left.base / right.base,
        stride: left.stride / right.base,
      };
    default:
      return undefined;
  }
}

function topLevelNumericConstants(
  file: ts.SourceFile,
): Map<string, number> {
  const constants = new Map<string, number>();
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        !ts.isIdentifier(declaration.name) ||
        !declaration.initializer
      ) {
        continue;
      }
      const numeric = numericLiteralValue(
        declaration.initializer,
      );
      if (numeric !== undefined) {
        constants.set(declaration.name.text, numeric);
      }
    }
  }
  return constants;
}

function topLevelArrayCounts(
  file: ts.SourceFile,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer &&
        ts.isArrayLiteralExpression(
          declaration.initializer,
        )
      ) {
        counts.set(
          declaration.name.text,
          declaration.initializer.elements.length,
        );
      }
    }
  }
  return counts;
}

function spatialContextOffsetSeriesFromDeclaration(
  declaration: ts.VariableDeclaration,
  file: ts.SourceFile,
  source: SourceRef,
  constants: ReadonlyMap<string, number>,
  arrayCounts: ReadonlyMap<string, number>,
): ScriptSpatialContextOffsetSeries | undefined {
  if (
    !ts.isIdentifier(declaration.name) ||
    !declaration.initializer ||
    !ts.isCallExpression(declaration.initializer) ||
    !ts.isPropertyAccessExpression(
      declaration.initializer.expression,
    ) ||
    declaration.initializer.expression.name.text !== "map"
  ) {
    return undefined;
  }

  const sourceExpression =
    declaration.initializer.expression.expression;
  if (!ts.isIdentifier(sourceExpression)) {
    return undefined;
  }
  const contextCount = arrayCounts.get(
    sourceExpression.text,
  );
  if (contextCount === undefined) return undefined;

  const callback = declaration.initializer.arguments[0];
  if (
    !callback ||
    !(
      ts.isArrowFunction(callback) ||
      ts.isFunctionExpression(callback)
    ) ||
    callback.parameters.length < 2
  ) {
    return undefined;
  }

  const indexParameterNode = callback.parameters[1]?.name;
  if (
    !indexParameterNode ||
    !ts.isIdentifier(indexParameterNode)
  ) {
    return undefined;
  }

  const values = new Map<string, AffineScalar>();
  values.set(indexParameterNode.text, {
    base: 0,
    stride: 1,
  });

  let returned: ts.Expression | undefined;
  if (ts.isBlock(callback.body)) {
    for (const statement of callback.body.statements) {
      if (ts.isVariableStatement(statement)) {
        for (const local of statement.declarationList.declarations) {
          if (
            !ts.isIdentifier(local.name) ||
            !local.initializer
          ) {
            continue;
          }
          const affine = affineExpression(
            local.initializer,
            file,
            values,
            constants,
          );
          if (affine) values.set(local.name.text, affine);
        }
      } else if (ts.isReturnStatement(statement)) {
        returned = statement.expression;
      }
    }
  } else {
    returned = callback.body;
  }

  if (
    !returned ||
    !ts.isObjectLiteralExpression(returned)
  ) {
    return undefined;
  }

  const offsetProperty = returned.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) &&
      declarationMemberName(property.name) !== undefined &&
      /offset/i.test(
        declarationMemberName(property.name)!,
      ) &&
      ts.isObjectLiteralExpression(property.initializer),
  );
  if (
    !offsetProperty ||
    !ts.isObjectLiteralExpression(
      offsetProperty.initializer,
    )
  ) {
    return undefined;
  }

  const offsetPath = declarationMemberName(
    offsetProperty.name,
  );
  if (!offsetPath) return undefined;

  const axis = (
    name: "x" | "y" | "z",
  ): AffineScalar | undefined => {
    const property = objectPropertyAssignment(
      offsetProperty.initializer as ts.ObjectLiteralExpression,
      [name],
    );
    return property
      ? affineExpression(
          property.initializer,
          file,
          values,
          constants,
        )
      : undefined;
  };

  const x = axis("x");
  const y = axis("y");
  const z = axis("z");
  if (!x || !y || !z) return undefined;

  let contextIdPrefix: string | undefined;
  let contextIdIndexBase: number | undefined;
  const idProperty = objectPropertyAssignment(
    returned,
    ["id", "arenaId", "contextId"],
  );
  if (
    idProperty &&
    ts.isTemplateExpression(idProperty.initializer) &&
    idProperty.initializer.templateSpans.length === 1
  ) {
    const span =
      idProperty.initializer.templateSpans[0]!;
    const idValue = affineExpression(
      span.expression,
      file,
      values,
      constants,
    );
    if (
      idValue &&
      idValue.stride === 1 &&
      span.literal.text.length === 0
    ) {
      contextIdPrefix =
        idProperty.initializer.head.text;
      contextIdIndexBase = idValue.base;
    }
  }

  return {
    collectionName: declaration.name.text,
    sourceCollectionName: sourceExpression.text,
    contextCount,
    offsetPath,
    offsetBase: {
      x: x.base,
      y: y.base,
      z: z.base,
    },
    offsetStride: {
      x: x.stride,
      y: y.stride,
      z: z.stride,
    },
    ...(contextIdPrefix === undefined
      ? {}
      : { contextIdPrefix }),
    ...(contextIdIndexBase === undefined
      ? {}
      : { contextIdIndexBase }),
    source: lineSource(file, declaration, source),
  };
}

function spatialContextOffsetSeriesFromFile(
  file: ts.SourceFile,
  source: SourceRef,
): ScriptSpatialContextOffsetSeries[] {
  const constants = topLevelNumericConstants(file);
  const arrayCounts = topLevelArrayCounts(file);
  const output: ScriptSpatialContextOffsetSeries[] = [];

  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const series =
        spatialContextOffsetSeriesFromDeclaration(
          declaration,
          file,
          source,
          constants,
          arrayCounts,
        );
      if (series) output.push(series);
    }
  }

  return output;
}

function conditionIdentifiers(
  expression: ts.Expression,
): string[] {
  const values = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) values.add(node.text);
    if (ts.isPropertyAccessExpression(node)) {
      values.add(node.getText());
    }
    ts.forEachChild(node, visit);
  };
  visit(expression);
  return [...values].sort();
}

function guardOperand(
  expression: ts.Expression,
  file: ts.SourceFile,
): ScriptGuardOperand | undefined {
  const value =
    ts.isParenthesizedExpression(expression)
      ? expression.expression
      : expression;

  if (
    ts.isIdentifier(value) ||
    ts.isPropertyAccessExpression(value)
  ) {
    return {
      kind: "path",
      path: value.getText(file),
    };
  }

  if (ts.isElementAccessExpression(value)) {
    const base = guardOperand(value.expression, file);
    const argument = value.argumentExpression
      ? guardOperand(value.argumentExpression, file)
      : undefined;
    if (base && argument) {
      return {
        kind: "index",
        base,
        key: argument,
      };
    }
    return undefined;
  }

  if (
    ts.isStringLiteralLike(value) ||
    ts.isNoSubstitutionTemplateLiteral(value)
  ) {
    return {
      kind: "literal",
      value: value.text,
    };
  }

  if (ts.isNumericLiteral(value)) {
    return {
      kind: "literal",
      value: Number(value.text),
    };
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

  return undefined;
}

function guardPredicate(
  expression: ts.Expression,
  file: ts.SourceFile,
): ScriptGuardPredicate {
  const value =
    ts.isParenthesizedExpression(expression)
      ? expression.expression
      : expression;

  if (
    ts.isPrefixUnaryExpression(value) &&
    value.operator === ts.SyntaxKind.ExclamationToken
  ) {
    const operand = guardOperand(value.operand, file);
    return operand
      ? { kind: "falsy", operand }
      : { kind: "unknown", text: value.getText(file) };
  }

  if (
    ts.isCallExpression(value) &&
    ts.isPropertyAccessExpression(value.expression) &&
    value.expression.name.text === "includes" &&
    value.arguments.length === 1 &&
    ts.isArrayLiteralExpression(value.expression.expression)
  ) {
    const operand = value.arguments[0]
      ? guardOperand(value.arguments[0], file)
      : undefined;
    const members: Array<
      string | number | boolean | null
    > = [];

    for (const element of value.expression.expression.elements) {
      const member = guardOperand(element as ts.Expression, file);
      if (!member || member.kind !== "literal") {
        return {
          kind: "unknown",
          text: value.getText(file),
        };
      }
      members.push(member.value);
    }

    if (operand) {
      return {
        kind: "in",
        operand,
        values: members,
      };
    }
  }

  if (ts.isBinaryExpression(value)) {
    if (
      value.operatorToken.kind ===
      ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      return {
        kind: "all",
        predicates: [
          guardPredicate(value.left, file),
          guardPredicate(value.right, file),
        ],
      };
    }

    if (
      value.operatorToken.kind ===
      ts.SyntaxKind.BarBarToken
    ) {
      return {
        kind: "any",
        predicates: [
          guardPredicate(value.left, file),
          guardPredicate(value.right, file),
        ],
      };
    }

    const operator: Extract<
      ScriptGuardPredicate,
      { kind: "comparison" }
    >["operator"] | undefined =
      value.operatorToken.kind ===
      ts.SyntaxKind.EqualsEqualsToken ||
      value.operatorToken.kind ===
      ts.SyntaxKind.EqualsEqualsEqualsToken
        ? "eq"
        : value.operatorToken.kind ===
            ts.SyntaxKind.ExclamationEqualsToken ||
          value.operatorToken.kind ===
            ts.SyntaxKind.ExclamationEqualsEqualsToken
        ? "neq"
        : value.operatorToken.kind ===
            ts.SyntaxKind.LessThanToken
        ? "lt"
        : value.operatorToken.kind ===
            ts.SyntaxKind.LessThanEqualsToken
        ? "lte"
        : value.operatorToken.kind ===
            ts.SyntaxKind.GreaterThanToken
        ? "gt"
        : value.operatorToken.kind ===
            ts.SyntaxKind.GreaterThanEqualsToken
        ? "gte"
        : undefined;

    if (operator) {
      const left = guardOperand(value.left, file);
      const right = guardOperand(value.right, file);
      if (left && right) {
        return {
          kind: "comparison",
          operator,
          left,
          right,
        };
      }
    }
  }

  const operand = guardOperand(value, file);
  if (operand) return { kind: "truthy", operand };

  return {
    kind: "unknown",
    text: value.getText(file),
  };
}

function inferFallbackGuardedOutcomes(
  file: ts.SourceFile,
  source: SourceRef,
): ScriptGuardedOutcome[] {
  const output: ScriptGuardedOutcome[] = [];

  const scanBody = (
    body: ts.Block,
    executionRegion: string,
  ): void => {
    const priorTerminalGuards: ScriptGuardPredicate[] = [];
    const priorGuardTexts: string[] = [];

    for (const inner of body.statements) {
      if (ts.isIfStatement(inner)) {
        const returns = directReturnStatements(
          inner.thenStatement,
        );
        if (returns.length > 0) {
          priorTerminalGuards.push(
            guardPredicate(inner.expression, file),
          );
          priorGuardTexts.push(
            inner.expression.getText(file),
          );
        }
        continue;
      }

      if (
        ts.isReturnStatement(inner) &&
        priorTerminalGuards.length > 0
      ) {
        for (const outcome of outcomePropertiesFromReturn(inner)) {
          output.push({
            executionRegion,
            conditionText:
              "fallback after: " +
              priorGuardTexts.join(" | "),
            conditionIdentifiers: [
              ...new Set(
                priorGuardTexts.flatMap((text) =>
                  text.match(/[A-Za-z_$][\w$]*/g) ?? []
                ),
              ),
            ].sort(),
            predicate: {
              kind: "fallback",
              excludedPredicates: [
                ...priorTerminalGuards,
              ],
            },
            propertyName: outcome.propertyName,
            value: outcome.value,
            conditionSource: lineSource(
              file,
              inner,
              source,
            ),
            outcomeSource: lineSource(
              file,
              outcome.sourceNode,
              source,
            ),
          });
        }
      }
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.body) {
      scanBody(
        node.body,
        node.name
          ? "function:" + node.name.text
          : "anonymous-function",
      );
    } else if (ts.isMethodDeclaration(node) && node.body) {
      const name = declarationMemberName(node.name);
      if (name) scanBody(node.body, "function:" + name);
    }

    ts.forEachChild(node, visit);
  };

  visit(file);
  return output;
}

function requiredTrueCalls(
  expression: ts.Expression,
): ts.CallExpression[] {
  if (ts.isParenthesizedExpression(expression)) {
    return requiredTrueCalls(expression.expression);
  }
  if (ts.isCallExpression(expression)) return [expression];

  if (ts.isBinaryExpression(expression)) {
    if (expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return [
        ...requiredTrueCalls(expression.left),
        ...requiredTrueCalls(expression.right),
      ];
    }

    const equality =
      expression.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
      expression.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken;
    const inequality =
      expression.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken ||
      expression.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken;

    if (equality || inequality) {
      const leftTrue = expression.left.kind === ts.SyntaxKind.TrueKeyword;
      const rightTrue = expression.right.kind === ts.SyntaxKind.TrueKeyword;
      const leftFalse = expression.left.kind === ts.SyntaxKind.FalseKeyword;
      const rightFalse = expression.right.kind === ts.SyntaxKind.FalseKeyword;

      if ((equality && leftTrue) || (inequality && leftFalse)) {
        return requiredTrueCalls(expression.right);
      }
      if ((equality && rightTrue) || (inequality && rightFalse)) {
        return requiredTrueCalls(expression.left);
      }
    }
  }

  return [];
}

function sameStart(a: SourceRef, b: SourceRef): boolean {
  return (
    a.relativePath === b.relativePath &&
    a.range?.lineStart === b.range?.lineStart &&
    a.range?.columnStart === b.range?.columnStart
  );
}

function inferBlockMatchGuards(
  file: ts.SourceFile,
  source: SourceRef,
  methodCalls: readonly ParsedScriptFile["methodCalls"][number][],
): ScriptBlockMatchGuard[] {
  const output: ScriptBlockMatchGuard[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isIfStatement(node)) {
      for (const callNode of requiredTrueCalls(node.expression)) {
        const callSource = lineSource(file, callNode, source);
        const call = methodCalls.find((item) =>
          sameStart(item.source, callSource) &&
          item.method === "matches" &&
          (
            item.receiverType === "Block" ||
            item.receiverType === "BlockPermutation"
          )
        );
        if (!call?.receiverHint) continue;
        const receiverType =
          call.receiverType === "Block" || call.receiverType === "BlockPermutation"
            ? call.receiverType
            : undefined;
        if (!receiverType) continue;

        output.push({
          receiverHint: call.receiverHint,
          receiverType,
          conditionSource: lineSource(file, node.expression, source),
          guardedSource: lineSource(file, node.thenStatement, source),
          executionRegion: localExecutionRegionId(node, file),
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(file);
  return output;
}

function customCommandCallback(
  call: ts.CallExpression,
): ts.ArrowFunction | ts.FunctionExpression | undefined {
  if (!ts.isPropertyAccessExpression(call.expression)) return undefined;
  const chain = propertyAccessChain(call.expression);
  if (
    chain.length !== 3 ||
    chain[1] !== "customCommandRegistry" ||
    chain[2] !== "registerCommand"
  ) {
    return undefined;
  }

  const callback = call.arguments[1];
  return callback &&
    (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
    ? callback
    : undefined;
}

function sourceInside(inner: SourceRef, outer: SourceRef): boolean {
  const innerStartLine = inner.range?.lineStart;
  const innerEndLine = inner.range?.lineEnd;
  const outerStartLine = outer.range?.lineStart;
  const outerEndLine = outer.range?.lineEnd;
  if (
    innerStartLine === undefined ||
    innerEndLine === undefined ||
    outerStartLine === undefined ||
    outerEndLine === undefined
  ) {
    return false;
  }

  const innerStartColumn = inner.range?.columnStart;
  const innerEndColumn = inner.range?.columnEnd;
  const outerStartColumn = outer.range?.columnStart;
  const outerEndColumn = outer.range?.columnEnd;

  const startsAfterOuter =
    innerStartLine > outerStartLine ||
    (
      innerStartLine === outerStartLine &&
      (
        outerStartColumn === undefined ||
        innerStartColumn === undefined ||
        innerStartColumn >= outerStartColumn
      )
    );

  const endsBeforeOuter =
    innerEndLine < outerEndLine ||
    (
      innerEndLine === outerEndLine &&
      (
        outerEndColumn === undefined ||
        innerEndColumn === undefined ||
        innerEndColumn <= outerEndColumn
      )
    );

  return startsAfterOuter && endsBeforeOuter;
}

function contextualCallSymbol(node: ts.CallExpression): string | undefined {
  if (!ts.isPropertyAccessExpression(node.expression)) return undefined;
  const method = node.expression.name.text;
  const receiver = node.expression.expression;

  if (
    ts.isPropertyAccessExpression(receiver) &&
    (receiver.name.text === "player" || receiver.name.text === "entity")
  ) {
    if (method === "setGameMode" || method === "setSpawnPoint") {
      return `Player.${method}`;
    }
    if (
      method === "addTag" ||
      method === "removeTag" ||
      method === "applyKnockback" ||
      method === "setProperty" ||
      method === "teleport"
    ) {
      return `Entity.${method}`;
    }
  }

  return undefined;
}

function contextualWriteSymbol(node: ts.BinaryExpression): string | undefined {
  if (node.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return undefined;
  if (!ts.isPropertyAccessExpression(node.left)) return undefined;

  const property = node.left.name.text;
  const receiver = node.left.expression;
  if (
    ts.isPropertyAccessExpression(receiver) &&
    receiver.name.text === "player"
  ) {
    if (property === "commandPermissionLevel") return "Player.commandPermissionLevel";
    if (property === "nameTag" || property === "isSneaking") {
      return `Entity.${property}`;
    }
  }
  return undefined;
}

function scanRestrictedMutations(
  callback: ts.Node,
  root: RestrictedExecutionMutation["root"],
  context: RestrictedExecutionMutation["context"],
  event: string,
  file: ts.SourceFile,
  source: SourceRef,
  methodCalls: ReadonlyArray<ParsedScriptFile["methodCalls"][number]>,
  propertyWrites: ReadonlyArray<ParsedScriptFile["propertyWrites"][number]>,
): RestrictedExecutionMutation[] {
  const output: RestrictedExecutionMutation[] = [];
  const callbackSource = lineSource(file, callback, source);
  const occupied = new Set<string>();

  for (const call of methodCalls) {
    if (!sourceInside(call.source, callbackSource)) continue;
    const rule = findScriptExecutionPrivilegeRule(call.symbol, "call");
    if (!rule) continue;
    const line = call.source.range?.lineStart ?? 0;
    occupied.add(`${line}\0call\0${call.method}`);
    output.push({
      root,
      context,
      event,
      method: call.method,
      symbol: call.symbol,
      operation: "call",
      evidence: "exact-symbol",
      ruleId: rule.id,
      source: call.source,
    });
  }

  for (const write of propertyWrites) {
    if (!sourceInside(write.source, callbackSource)) continue;
    const rule = findScriptExecutionPrivilegeRule(write.symbol, "write");
    if (!rule) continue;
    const line = write.source.range?.lineStart ?? 0;
    occupied.add(`${line}\0write\0${write.property}`);
    output.push({
      root,
      context,
      event,
      method: write.property,
      symbol: write.symbol,
      operation: "write",
      evidence: "exact-symbol",
      ruleId: rule.id,
      source: write.source,
    });
  }

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const symbol = contextualCallSymbol(node);
      if (symbol && ts.isPropertyAccessExpression(node.expression)) {
        const rule = findScriptExecutionPrivilegeRule(symbol, "call");
        const nodeSource = lineSource(file, node, source);
        const line = nodeSource.range?.lineStart ?? 0;
        const method = node.expression.name.text;
        const key = `${line}\0call\0${method}`;
        if (rule && !occupied.has(key)) {
          output.push({
            root,
            context,
            event,
            method,
            symbol,
            operation: "call",
            evidence: "contextual-fallback",
            ruleId: rule.id,
            source: nodeSource,
          });
        }
      }
    }

    if (ts.isBinaryExpression(node)) {
      const symbol = contextualWriteSymbol(node);
      if (symbol && ts.isPropertyAccessExpression(node.left)) {
        const rule = findScriptExecutionPrivilegeRule(symbol, "write");
        const nodeSource = lineSource(file, node.left, source);
        const line = nodeSource.range?.lineStart ?? 0;
        const method = node.left.name.text;
        const key = `${line}\0write\0${method}`;
        if (rule && !occupied.has(key)) {
          output.push({
            root,
            context,
            event,
            method,
            symbol,
            operation: "write",
            evidence: "contextual-fallback",
            ruleId: rule.id,
            source: nodeSource,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(callback);

  const seen = new Set<string>();
  return output.filter((item) => {
    const key = [
      item.source.range?.lineStart ?? 0,
      item.symbol,
      item.operation,
    ].join("\0");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseScriptFile(
  identifier: string,
  text: string,
  source: SourceRef,
): ParsedScriptFile {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );
  const arenaAuthorityEvidence =
    deriveScriptArenaAuthorityEvidence(
      text,
      source,
    );
  const arenaAuthorityPaths =
    correlateScriptArenaAuthorityPaths(
      arenaAuthorityEvidence,
    );
  const persistenceIdempotencyGuards =
    derivePersistenceIdempotencyGuards(
      text,
      source,
    );
  const safeConfig = compileScriptSafeConfig(
    text,
    source,
  );
  const spatialMutations = deriveScriptSpatialMutations(
    text,
    source,
  );
  const inventoryLifecycleEvidence =
    deriveScriptInventoryLifecycleEvidence(
      text,
      source,
    );
  const combatLifecycleEvidence =
    deriveScriptCombatLifecycleEvidence(
      text,
      source,
    );
  const chunkLifecycleEvidence =
    deriveScriptChunkLifecycleEvidence(
      text,
      source,
    );
  const economyEvidence =
    deriveScriptEconomyEvidence(
      text,
      source,
    );
  const cleanupResourceEvidence =
    deriveScriptCleanupResourceEvidence(
      text,
      source,
    );
  const globalLeaseEvidence =
    deriveScriptGlobalLeaseEvidence(
      text,
      source,
    );
  const progressionCounterEvidence =
    deriveScriptProgressionCounterEvidence(
      text,
      source,
    );
  const progressionActorSpawnEvidence =
    deriveScriptProgressionActorSpawnEvidence(
      text,
      source,
    );
  const progressionActorRegistryEvidence =
    deriveScriptProgressionActorRegistryEvidence(
      text,
      source,
    );
  const persistentDataLifecycleEvidence =
    derivePersistentDataLifecycleEvidence(
      text,
      source,
    );
  const resultAuditRecordEvidence =
    deriveResultAuditRecordEvidence(
      text,
      source,
    );
  const blockCustomComponentRegistrations =
    deriveBlockCustomComponentRegistrations(text, source);
  const persistentReconciliation =
    derivePersistentReconciliationEvidence(text, source);
  const topLevelFunctionNames = new Set(
    file.statements
      .filter(ts.isFunctionDeclaration)
      .flatMap((statement) => statement.name ? [statement.name.text] : []),
  );

  const topLevelCallbackSources = new Map(
    file.statements
      .filter(ts.isFunctionDeclaration)
      .flatMap(statement => statement.name
        ? [[statement.name.text, lineSource(file, statement, source)] as const]
        : []),
  );
  // Top-level const function values have a stable declaration source.
  // Mutable bindings and untracked alias chains remain unresolved.
  const topLevelConstCallbacks = new Map<string, ts.ArrowFunction | ts.FunctionExpression>();
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement) ||
        !(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      if (ts.isArrowFunction(declaration.initializer) ||
          ts.isFunctionExpression(declaration.initializer)) {
        topLevelConstCallbacks.set(declaration.name.text, declaration.initializer);
      }
    }
  }
  const bindsName = (binding: ts.BindingName, name: string): boolean =>
    ts.isIdentifier(binding)
      ? binding.text === name
      : binding.elements.some(element =>
          ts.isBindingElement(element) && bindsName(element.name, name));
  const isShadowed = (identifier: ts.Identifier): boolean => {
    let current: ts.Node | undefined = identifier.parent;
    while (current && current !== file) {
      if (ts.isFunctionLike(current) && current.parameters.some(parameter =>
        bindsName(parameter.name, identifier.text))) return true;
      if (ts.isCatchClause(current) && current.variableDeclaration &&
          bindsName(current.variableDeclaration.name, identifier.text)) return true;
      if ((ts.isForStatement(current) || ts.isForInStatement(current) ||
          ts.isForOfStatement(current)) && current.initializer &&
          ts.isVariableDeclarationList(current.initializer) &&
          current.initializer.declarations.some(declaration =>
            bindsName(declaration.name, identifier.text))) return true;
      if (ts.isBlock(current) || ts.isSourceFile(current)) {
        const statements = current.statements;
        if (statements?.some(statement =>
          (ts.isVariableStatement(statement) && statement.declarationList.declarations.some(
            declaration => bindsName(declaration.name, identifier.text))) ||
          (ts.isFunctionDeclaration(statement) && statement.name?.text === identifier.text)
        )) {
          if (current !== file) return true;
        }
      }
      current = current.parent;
    }
    return false;
  };
  const constCallback = (call: ts.CallExpression): ts.ArrowFunction | ts.FunctionExpression | undefined => {
    const first = call.arguments[0];
    return first && ts.isIdentifier(first) && !isShadowed(first) ? topLevelConstCallbacks.get(first.text) : undefined;
  };
  const namedCallback = (call: ts.CallExpression): string | undefined => {
    const first = call.arguments[0];
    return first && ts.isIdentifier(first) && !isShadowed(first) && topLevelFunctionNames.has(first.text)
      ? first.text : undefined;
  };

  const imports: ScriptImport[] = [];
  const events: ScriptEventSubscription[] = [];
  const dynamicProperties: DynamicPropertyAccess[] = [];
  const restrictedMutations: RestrictedExecutionMutation[] = [];
  const deferredCallbacks: ScriptDeferredCallback[] = [];
  const localFunctionCalls: ScriptLocalFunctionCall[] = [];
  const methodCalls = inferScriptMethodCalls(file, source);
  const spatialWorldMutations =
    deriveScriptSpatialWorldMutations(
      text,
      source,
      methodCalls,
      safeConfig.bindings,
    );
  const blockMatchGuards = inferBlockMatchGuards(
    file,
    source,
    methodCalls,
  );
  const propertyAccesses = inferScriptPropertyAccesses(file, source);
  const propertyWrites = inferScriptPropertyWrites(file, source);
  const entityEventTriggers: ScriptEntityEventTrigger[] = [];
  const commandLiterals: ScriptCommandLiteral[] = [];
  const lifecycleMemberExposures = inferScriptLifecycleMemberExposures(
    file,
    source,
    methodCalls,
  );
  const moduleMemberAccesses: ScriptModuleMemberAccess[] = [];
  const importedSymbols: ScriptImportedSymbol[] = [];
  const enumValueComparisons: ScriptEnumValueComparison[] = [];
  const stateMutations: ScriptStateMutation[] = [];
  const typeProperties: ScriptTypeProperty[] = [];
  const transitionDeclarations: ScriptTransitionDeclaration[] = [];
  const returnOutcomes: ScriptReturnOutcome[] = [];
  const guardedOutcomes: ScriptGuardedOutcome[] = [];
  const declaredMembers: ScriptDeclaredMember[] = [];
  const spatialRoutePoints: ScriptSpatialRoutePoint[] = [];
  const spatialOffsetTransforms =
    spatialOffsetTransformsFromFile(file, source);
  const spatialTransformUses: ScriptSpatialTransformUse[] = [];
  const spatialContextOffsetSeries =
    spatialContextOffsetSeriesFromFile(file, source);
  const spatialTransformNames = new Set(
    spatialOffsetTransforms.map((item) => item.functionName),
  );
  const namedMinecraftBindings = minecraftNamedBindings(file);
  const namespaceMinecraftBindings = minecraftNamespaceBindings(file);
  const canonicalMinecraftMember = (
    expression: ts.Expression,
  ): { module: string; enumName: string; member: string; symbol: string } | undefined => {
    if (!ts.isPropertyAccessExpression(expression)) return undefined;

    if (ts.isIdentifier(expression.expression)) {
      const binding = namedMinecraftBindings.get(expression.expression.text);
      if (binding) {
        return {
          module: binding.module,
          enumName: binding.importedName,
          member: expression.name.text,
          symbol: `${binding.importedName}.${expression.name.text}`,
        };
      }
    }

    const chain = propertyAccessChain(expression);
    const namespaceModule = chain[0]
      ? namespaceMinecraftBindings.get(chain[0])
      : undefined;
    if (namespaceModule && chain.length === 3 && chain[1] && chain[2]) {
      return {
        module: namespaceModule,
        enumName: chain[1],
        member: chain[2],
        symbol: `${chain[1]}.${chain[2]}`,
      };
    }

    return undefined;
  };

  const STATE_TARGET_PATTERN = /(?:^|[_$.-])(state|status|phase|stage|mode)(?:$|[_$.-])/i;

  const stateMutationTarget = (
    expression: ts.Expression,
  ): { target: string; targetName: string } | undefined => {
    if (ts.isIdentifier(expression)) {
      if (!STATE_TARGET_PATTERN.test(expression.text)) return undefined;
      return {
        target: expression.text,
        targetName: expression.text,
      };
    }
    if (ts.isPropertyAccessExpression(expression)) {
      const target = expression.getText(file);
      const targetName = expression.name.text;
      if (!STATE_TARGET_PATTERN.test(targetName)) return undefined;
      return { target, targetName };
    }
    return undefined;
  };

  const stateMutationValue = (
    expression: ts.Expression,
  ): ScriptStateMutation["value"] | undefined => {
    if (
      ts.isStringLiteralLike(expression) ||
      ts.isNoSubstitutionTemplateLiteral(expression)
    ) {
      return {
        kind: "literal",
        literal: expression.text,
      };
    }
    if (ts.isNumericLiteral(expression)) {
      return {
        kind: "literal",
        literal: expression.text,
      };
    }
    if (
      expression.kind === ts.SyntaxKind.TrueKeyword ||
      expression.kind === ts.SyntaxKind.FalseKeyword
    ) {
      return {
        kind: "literal",
        literal:
          expression.kind === ts.SyntaxKind.TrueKeyword
            ? "true"
            : "false",
      };
    }
    if (ts.isPropertyAccessExpression(expression)) {
      const chain = propertyAccessChain(expression);
      if (chain.length < 2) return undefined;
      const owner = chain.slice(0, -1).join(".");
      const member = chain.at(-1);
      if (!member) return undefined;
      return {
        kind: "member",
        owner,
        member,
        symbol: chain.join("."),
      };
    }
    return undefined;
  };

  const recordStateType = (
    node: ts.TypeNode | undefined,
  ): string | undefined => {
    if (!node) return undefined;
    const text = node.getText(file);
    const match = text.match(/Record\s*<\s*([A-Za-z_$][\w$]*)\s*,/);
    return match?.[1];
  };

  const transitionArray = (
    expression: ts.Expression,
  ): string[] | undefined => {
    const value =
      ts.isAsExpression(expression) ||
      ts.isTypeAssertionExpression(expression)
        ? expression.expression
        : expression;
    if (!ts.isArrayLiteralExpression(value)) return undefined;
    const items: string[] = [];
    for (const element of value.elements) {
      if (!ts.isStringLiteralLike(element)) return undefined;
      items.push(element.text);
    }
    return items;
  };

  const capabilities: ScriptCapabilityUse[] = [
    ...methodCalls.map((call) => ({
      capability: "api-method" as const,
      detail: call.symbol,
      source: call.source,
    })),
    ...propertyAccesses.map((access) => ({
      capability: "api-property" as const,
      detail: access.symbol,
      source: access.source,
    })),
    ...propertyWrites.map((write) => ({
      capability: "api-property-write" as const,
      detail: write.symbol,
      source: write.source,
    })),
  ];

  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const routePoint = spatialRoutePointFromObject(
        node,
        file,
        source,
      );
      if (routePoint) spatialRoutePoints.push(routePoint);
    }

    if (
      ts.isMethodDeclaration(node) ||
      ts.isPropertyDeclaration(node)
    ) {
      const member = declarationMemberName(node.name);
      if (member) {
        const containerHint =
          declarationContainerHint(node);
        declaredMembers.push({
          member,
          memberKind: ts.isMethodDeclaration(node)
            ? "method"
            : "property",
          ...(containerHint === undefined
            ? {}
            : { containerHint }),
          source: lineSource(file, node, source),
        });
      }
    }

    if (ts.isStringLiteralLike(node)) {
      const command = node.text.trim();
      const runCommandContext = runCommandStringContext(node, file);
      if (
        !runCommandContext &&
        /^\/?(?:summon|event)\s+/i.test(command)
      ) {
        commandLiterals.push({
          command,
          mechanism: "embedded-literal",
          executionRegion: localExecutionRegionId(node, file),
          source: lineSource(file, node, source),
        });
      }
    }

    if (ts.isReturnStatement(node) && node.expression) {
      for (const outcome of outcomePropertiesFromReturn(node)) {
        returnOutcomes.push({
          executionRegion: localExecutionRegionId(node, file),
          propertyName: outcome.propertyName,
          value: outcome.value,
          source: lineSource(file, outcome.sourceNode, source),
        });
      }
    }

    if (ts.isIfStatement(node)) {
      const conditionText = node.expression.getText(file);
      const identifiers = conditionIdentifiers(node.expression);
      for (const returnNode of directReturnStatements(node.thenStatement)) {
        for (const outcome of outcomePropertiesFromReturn(returnNode)) {
          guardedOutcomes.push({
            executionRegion: localExecutionRegionId(node, file),
            conditionText,
            conditionIdentifiers: identifiers,
            predicate: guardPredicate(node.expression, file),
            propertyName: outcome.propertyName,
            value: outcome.value,
            conditionSource: lineSource(file, node.expression, source),
            outcomeSource: lineSource(file, outcome.sourceNode, source),
          });
        }
      }
    }

    if (ts.isInterfaceDeclaration(node)) {
      for (const member of node.members) {
        if (!ts.isPropertySignature(member) || !member.type || !member.name) {
          continue;
        }
        const propertyName =
          ts.isIdentifier(member.name) ||
          ts.isStringLiteralLike(member.name)
            ? member.name.text
            : undefined;
        if (!propertyName) continue;
        typeProperties.push({
          containerName: node.name.text,
          propertyName,
          typeText: member.type.getText(file),
          optional: member.questionToken !== undefined,
          source: lineSource(file, member, source),
        });
      }
    }

    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (
          !ts.isIdentifier(declaration.name) ||
          !declaration.initializer ||
          !/transition/i.test(declaration.name.text)
        ) {
          continue;
        }

        const initializer =
          ts.isAsExpression(declaration.initializer) ||
          ts.isTypeAssertionExpression(declaration.initializer)
            ? declaration.initializer.expression
            : declaration.initializer;
        if (!ts.isObjectLiteralExpression(initializer)) continue;

        const tableName = declaration.name.text;
        const stateType = recordStateType(declaration.type);

        for (const property of initializer.properties) {
          if (!ts.isPropertyAssignment(property)) continue;
          const from =
            ts.isIdentifier(property.name) ||
            ts.isStringLiteralLike(property.name)
              ? property.name.text
              : undefined;
          if (!from) continue;
          const to = transitionArray(property.initializer);
          if (!to) continue;
          transitionDeclarations.push({
            tableName,
            ...(stateType === undefined ? {} : { stateType }),
            from,
            to,
            source: lineSource(file, property, source),
          });
        }
      }
    }

    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const module = node.moduleSpecifier.text;
      imports.push({
        module,
        kind: classifyModule(module),
        bindings: importBindings(node),
        source: lineSource(file, node, source),
      });

      const clause = node.importClause;
      const named = clause?.namedBindings;
      if (module.startsWith("@minecraft/") && named && ts.isNamedImports(named)) {
        for (const element of named.elements) {
          const importedName = element.propertyName?.text ?? element.name.text;
          const use: ScriptImportedSymbol = {
            module,
            importedName,
            localName: element.name.text,
            typeOnly: clause?.isTypeOnly === true || element.isTypeOnly,
            source: lineSource(file, element, source),
          };
          importedSymbols.push(use);
          capabilities.push({
            capability: "api-imported-symbol",
            detail: importedName,
            source: use.source,
          });
        }
      }
    }

    if (
      ts.isPropertyAccessExpression(node) &&
      !(ts.isCallExpression(node.parent) && node.parent.expression === node)
    ) {
      if (ts.isIdentifier(node.expression)) {
        const binding = namedMinecraftBindings.get(node.expression.text);
        if (binding) {
          const access: ScriptModuleMemberAccess = {
            module: binding.module,
            importedName: binding.importedName,
            localName: node.expression.text,
            member: node.name.text,
            symbol: `${binding.importedName}.${node.name.text}`,
            source: lineSource(file, node, source),
          };
          moduleMemberAccesses.push(access);
          capabilities.push({
            capability: "api-module-member",
            detail: access.symbol,
            source: access.source,
          });
        }
      }

      const chain = propertyAccessChain(node);
      const namespaceModule = chain[0]
        ? namespaceMinecraftBindings.get(chain[0])
        : undefined;
      const namespaceLocal = chain[0];
      const importedName = chain[1];
      const member = chain[2];
      if (
        namespaceModule &&
        chain.length === 3 &&
        namespaceLocal &&
        importedName &&
        member
      ) {
        const access: ScriptModuleMemberAccess = {
          module: namespaceModule,
          importedName,
          localName: namespaceLocal,
          member,
          symbol: `${importedName}.${member}`,
          source: lineSource(file, node, source),
        };
        moduleMemberAccesses.push(access);
        capabilities.push({
          capability: "api-module-member",
          detail: access.symbol,
          source: access.source,
        });
      }
    }

    if (ts.isTypeReferenceNode(node) && ts.isQualifiedName(node.typeName)) {
      const chain = qualifiedNameChain(node.typeName);
      const module = chain[0]
        ? namespaceMinecraftBindings.get(chain[0])
        : undefined;
      if (module && chain.length === 2 && chain[1]) {
        const use: ScriptImportedSymbol = {
          module,
          importedName: chain[1],
          localName: `${chain[0]}.${chain[1]}`,
          typeOnly: true,
          source: lineSource(file, node, source),
        };
        importedSymbols.push(use);
        capabilities.push({
          capability: "api-imported-symbol",
          detail: chain[1],
          source: use.source,
        });
      }
    }

    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const target = stateMutationTarget(node.left);
        const value = stateMutationValue(node.right);
        if (target && value) {
          stateMutations.push({
            ...target,
            value,
            executionRegion: localExecutionRegionId(node, file),
            source: lineSource(file, node, source),
          });
        }
      }

      const operatorKind = node.operatorToken.kind;
      const operator =
        operatorKind === ts.SyntaxKind.EqualsEqualsToken ? "==" :
        operatorKind === ts.SyntaxKind.EqualsEqualsEqualsToken ? "===" :
        operatorKind === ts.SyntaxKind.ExclamationEqualsToken ? "!=" :
        operatorKind === ts.SyntaxKind.ExclamationEqualsEqualsToken ? "!==" :
        undefined;

      if (operator) {
        const leftMember = canonicalMinecraftMember(node.left);
        const rightMember = canonicalMinecraftMember(node.right);
        const leftLiteral = ts.isStringLiteralLike(node.left) ? node.left.text : undefined;
        const rightLiteral = ts.isStringLiteralLike(node.right) ? node.right.text : undefined;
        const member = leftMember ?? rightMember;
        const literal = leftMember ? rightLiteral : leftLiteral;

        if (member && literal !== undefined) {
          enumValueComparisons.push({
            module: member.module,
            enumName: member.enumName,
            member: member.member,
            symbol: member.symbol,
            operator,
            literal,
            source: lineSource(file, node, source),
          });
        }
      }
    }

    if (ts.isIdentifier(node) && (node.text === "world" || node.text === "system")) {
      capabilities.push({
        capability: node.text === "world" ? "world-access" : "system-access",
        source: lineSource(file, node, source),
      });
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      spatialTransformNames.has(node.expression.text) &&
      node.arguments.length >= 2
    ) {
      const pointExpression = node.arguments[0];
      const contextExpression = node.arguments[1];
      if (pointExpression && contextExpression) {
        const pointText = pointExpression.getText(file);
        if (
          /(?:^|\.)(?:location|position|point)$/.test(
            pointText,
          )
        ) {
          spatialTransformUses.push({
            functionName: node.expression.text,
            pointExpression: pointText,
            contextExpression:
              contextExpression.getText(file),
            source: lineSource(file, node, source),
          });
        }
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      topLevelFunctionNames.has(node.expression.text)
    ) {
      localFunctionCalls.push({
        callerRegion: localExecutionRegionId(node, file),
        targetRegion: "function:" + node.expression.text,
        targetName: node.expression.text,
        controlFlow: localCallControlFlow(node),
        source: lineSource(file, node, source),
      });
    }

    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const chain = propertyAccessChain(node.expression);
      const methodName = node.expression.name.text;

      const localMethodTarget = directThisMethodTarget(node);
      if (localMethodTarget) {
        localFunctionCalls.push({
          callerRegion: localExecutionRegionId(node, file),
          targetRegion: "function:" + localMethodTarget,
          targetName: localMethodTarget,
          controlFlow: localCallControlFlow(node),
          source: lineSource(file, node, source),
        });
      }

      if (methodName === "runCommand" || methodName === "runCommandAsync") {
        const argument = node.arguments[0];
        if (
          argument &&
          (
            ts.isStringLiteralLike(argument) ||
            ts.isNoSubstitutionTemplateLiteral(argument)
          )
        ) {
          commandLiterals.push({
            command: argument.text.trim(),
            mechanism: methodName,
            executionRegion: localExecutionRegionId(node, file),
            receiverHint: node.expression.expression.getText(file),
            source: lineSource(file, argument, source),
          });
        }
      }

      const scheduler = deferredScheduler(node, namedMinecraftBindings);
      if (scheduler) {
        const callback = callbackNode(node) ?? constCallback(node);
        const namedScheduledCallback = namedCallback(node);
        const guardIdentifiers = callback
          ? generationGuardIdentifiers(callback)
          : [];
        const delayArgument =
          (
            scheduler === "runTimeout" ||
            scheduler === "runInterval"
          )
            ? node.arguments[1]
            : undefined;
        const delayTicks =
          delayArgument === undefined
            ? undefined
            : numericLiteralValue(
                delayArgument,
              );
        deferredCallbacks.push({
          scheduler,
          source: lineSource(file, node, source),
          callerRegion: localExecutionRegionId(node, file),
          ...(callback
            ? {
                callbackRegion: callbackExecutionRegionId(callback, file),
                callbackSource: lineSource(file, callback, source),
              }
            : namedScheduledCallback
              ? {
                  callbackRegion: "function:" + namedScheduledCallback,
                  callbackSource: topLevelCallbackSources.get(namedScheduledCallback),
                }
              : {}),
          guardEvidence: guardIdentifiers.length > 0
            ? "explicit-generation-check"
            : "unresolved",
          guardIdentifiers,
          ...(delayTicks === undefined
            ? {}
            : { delayTicks }),
        });
      }

      if (node.expression.name.text === "triggerEvent") {
        const eventArg = node.arguments[0];
        if (eventArg && ts.isStringLiteralLike(eventArg)) {
          entityEventTriggers.push({
            event: eventArg.text,
            receiverHint: node.expression.expression.getText(file),
            executionRegion: localExecutionRegionId(node, file),
            source: lineSource(file, node, source),
          });
        }
      }

      const commandCallback = customCommandCallback(node);
      if (commandCallback) {
        restrictedMutations.push(
          ...scanRestrictedMutations(
            commandCallback,
            "system",
            "custom-command",
            "customCommand",
            file,
            source,
            methodCalls,
            propertyWrites,
          ),
        );
      }

      if (chain.at(-1) === "subscribe") {
        const root = chain[0];
        const phase = chain[1];
        const event = chain[2];
        const rootBinding = root ? namedMinecraftBindings.get(root) : undefined;
        const canonicalRoot =
          rootBinding &&
          (rootBinding.importedName === "world" || rootBinding.importedName === "system")
            ? rootBinding.importedName
            : root;

        const normalizedRoot: ScriptEventSubscription["root"] =
          canonicalRoot === "world" || canonicalRoot === "system"
            ? canonicalRoot
            : "unknown";
        const normalizedPhase: ScriptEventSubscription["phase"] =
          phase === "beforeEvents" || phase === "afterEvents" ? phase : "unknown";

        if (event) {
          const eventSource = lineSource(file, node, source);
          const eventCallback = callbackNode(node) ?? constCallback(node);
          const namedEventCallback = namedCallback(node);
          events.push({
            root: normalizedRoot,
            phase: normalizedPhase,
            event,
            executionRegion: localExecutionRegionId(node, file),
            ...(eventCallback
              ? {
                  callbackRegion: callbackExecutionRegionId(eventCallback, file),
                  callbackSource: lineSource(file, eventCallback, source),
                }
              : namedEventCallback
                ? {
                    callbackRegion: "function:" + namedEventCallback,
                    callbackSource: topLevelCallbackSources.get(namedEventCallback),
                  }
                : {}),
            source: eventSource,
          });
          capabilities.push({
            capability: "event-subscription",
            detail: `${normalizedRoot}.${normalizedPhase}.${event}`,
            source: eventSource,
          });

          if (normalizedPhase === "beforeEvents") {
            capabilities.push({
              capability:
                normalizedRoot === "system" && event === "startup"
                  ? "early-execution"
                  : "restricted-execution",
              detail: `${normalizedRoot}.${normalizedPhase}.${event}`,
              source: eventSource,
            });

            const isStartup =
              normalizedRoot === "system" && event === "startup";
            if (eventCallback && !isStartup) {
              restrictedMutations.push(
                ...scanRestrictedMutations(
                  eventCallback,
                  normalizedRoot,
                  "before-event",
                  event,
                  file,
                  source,
                  methodCalls,
                  propertyWrites,
                ),
              );
            }
          }

          if (
            normalizedRoot === "system" &&
            normalizedPhase === "afterEvents" &&
            event === "scriptEventReceive"
          ) {
            capabilities.push({
              capability: "script-event",
              detail: "system.afterEvents.scriptEventReceive",
              source: eventSource,
            });
          }
        }
      }

      const method = chain.at(-1);
      if (
        method === "getDynamicProperty" ||
        method === "setDynamicProperty" ||
        method === "clearDynamicProperties" ||
        method === "getDynamicPropertyIds" ||
        method === "getDynamicPropertyTotalByteCount"
      ) {
        const access: DynamicPropertyAccess = {
          operation: dynamicPropertyOperation(method),
          receiverHint: node.expression.expression.getText(file),
          executionRegion: localExecutionRegionId(node, file),
          source: lineSource(file, node, source),
        };
        const propertyArgument = node.arguments[0];
        if (propertyArgument) {
          access.propertyExpression =
            propertyArgument.getText(file);
        }
        const propertyId = stringArgument(node);
        if (propertyId) access.propertyId = propertyId;
        dynamicProperties.push(access);
        capabilities.push({
          capability: "dynamic-properties",
          ...(propertyId ? { detail: `${access.operation}:${propertyId}` } : { detail: access.operation }),
          source: access.source,
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(file);

  for (const fallback of inferFallbackGuardedOutcomes(
    file,
    source,
  )) {
    guardedOutcomes.push(fallback);
  }

  return {
    identifier,
    source,
    blockCustomComponentRegistrations,
    persistentReconciliation,
    arenaAuthorityEvidence,
    arenaAuthorityPaths,
    persistenceIdempotencyGuards,
    safeConfigBindings: [...safeConfig.bindings],
    safeConfigFunctions: [...safeConfig.functions],
    safeConfigImports: [...safeConfig.imports],
    safeConfigExports: [...safeConfig.exports],
    safeConfigRejected: [...safeConfig.rejected],
    repairTransformHints: [
      ...deriveCapturedGenerationGuardTransformHints(
        identifier,
        text,
        source,
      ),
      ...derivePersistenceIdempotencyGuardTransformHints(
        identifier,
        text,
        source,
      ),
      ...deriveArenaCapacityGuardTransformHints(
        identifier,
        text,
        source,
      ),
      ...deriveArenaStartOwnershipGuardTransformHints(
        identifier,
        text,
        source,
      ),
    ],
    imports,
    events,
    dynamicProperties,
    restrictedMutations,
    deferredCallbacks,
    localFunctionCalls,
    blockMatchGuards,
    methodCalls,
    propertyAccesses,
    propertyWrites,
    entityEventTriggers,
    commandLiterals,
    lifecycleMemberExposures,
    moduleMemberAccesses,
    importedSymbols,
    enumValueComparisons,
    stateMutations,
    typeProperties,
    transitionDeclarations,
    returnOutcomes,
    guardedOutcomes,
    declaredMembers,
    spatialRoutePoints,
    spatialOffsetTransforms,
    spatialTransformUses,
    spatialContextOffsetSeries,
    spatialMutations: [...spatialMutations.mutations],
    cleanupResourceEvidence: [...cleanupResourceEvidence],
    chunkLifecycleEvidence: [
      ...chunkLifecycleEvidence,
    ],
    combatLifecycleEvidence: [
      ...combatLifecycleEvidence,
    ],
    economyEvidence: [
      ...economyEvidence,
    ],
    inventoryLifecycleEvidence: [
      ...inventoryLifecycleEvidence,
    ],
    globalLeaseEvidence: [...globalLeaseEvidence],
    progressionCounterEvidence: [
      ...progressionCounterEvidence,
    ],
    progressionActorSpawnEvidence: [
      ...progressionActorSpawnEvidence,
    ],
    progressionActorRegistryEvidence: [
      ...progressionActorRegistryEvidence,
    ],
    persistentDataLifecycleEvidence: [
      ...persistentDataLifecycleEvidence,
    ],
    resultAuditRecordEvidence: [
      ...resultAuditRecordEvidence,
    ],
    persistentStateScopes:
      inferPersistentStateScopes(
        dynamicProperties,
      ),
    persistentStateLifetimes:
      inferPersistentStateLifetimes(
        persistentDataLifecycleEvidence,
        inferPersistentStateScopes(
          dynamicProperties,
        ),
        cleanupResourceEvidence,
      ),
    spatialMutationRejected: [...spatialMutations.rejected],
    capabilities,
  };
}
