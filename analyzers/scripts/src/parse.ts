import ts from "typescript";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
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
} from "./types.js";
import {
  inferScriptMethodCalls,
  inferScriptPropertyAccesses,
  inferScriptPropertyWrites,
} from "./receiver-inference.js";
import { findScriptExecutionPrivilegeRule } from "../../../packages/compatibility/src/script-execution-privilege-matrix.js";
import { inferScriptLifecycleMemberExposures } from "./lifecycle-exposure.js";

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

        output.push({
          receiverHint: call.receiverHint,
          receiverType: call.receiverType,
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
  const topLevelFunctionNames = new Set(
    file.statements
      .filter(ts.isFunctionDeclaration)
      .flatMap((statement) => statement.name ? [statement.name.text] : []),
  );

  const imports: ScriptImport[] = [];
  const events: ScriptEventSubscription[] = [];
  const dynamicProperties: DynamicPropertyAccess[] = [];
  const restrictedMutations: RestrictedExecutionMutation[] = [];
  const deferredCallbacks: ScriptDeferredCallback[] = [];
  const localFunctionCalls: ScriptLocalFunctionCall[] = [];
  const methodCalls = inferScriptMethodCalls(file, source);
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
      topLevelFunctionNames.has(node.expression.text)
    ) {
      localFunctionCalls.push({
        callerRegion: localExecutionRegionId(node, file),
        targetRegion: "function:" + node.expression.text,
        targetName: node.expression.text,
        source: lineSource(file, node, source),
      });
    }

    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const chain = propertyAccessChain(node.expression);
      const methodName = node.expression.name.text;

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
        const callback = callbackNode(node);
        const guardIdentifiers = callback
          ? generationGuardIdentifiers(callback)
          : [];
        deferredCallbacks.push({
          scheduler,
          source: lineSource(file, node, source),
          ...(callback
            ? { callbackSource: lineSource(file, callback, source) }
            : {}),
          guardEvidence: guardIdentifiers.length > 0
            ? "explicit-generation-check"
            : "unresolved",
          guardIdentifiers,
        });
      }

      if (node.expression.name.text === "triggerEvent") {
        const eventArg = node.arguments[0];
        if (eventArg && ts.isStringLiteralLike(eventArg)) {
          entityEventTriggers.push({
            event: eventArg.text,
            receiverHint: node.expression.expression.getText(file),
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
          events.push({
            root: normalizedRoot,
            phase: normalizedPhase,
            event,
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

            const callback = callbackNode(node);
            const isStartup =
              normalizedRoot === "system" && event === "startup";
            if (callback && !isStartup) {
              restrictedMutations.push(
                ...scanRestrictedMutations(
                  callback,
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
          source: lineSource(file, node, source),
        };
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

  return {
    identifier,
    source,
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
    capabilities,
  };
}
