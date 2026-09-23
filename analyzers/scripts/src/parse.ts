import ts from "typescript";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type {
  DynamicPropertyAccess,
  ParsedScriptFile,
  RestrictedExecutionMutation,
  ScriptCapabilityUse,
  ScriptEventSubscription,
  ScriptImport,
  ScriptImportedSymbol,
  ScriptModuleMemberAccess,
} from "./types.js";
import {
  inferScriptMethodCalls,
  inferScriptPropertyAccesses,
} from "./receiver-inference.js";

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

const RESTRICTED_MUTATORS = new Set([
  "setGameMode",
  "spawnEntity",
  "setDynamicProperty",
  "clearDynamicProperties",
]);

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

function scanRestrictedMutations(
  callback: ts.Node,
  root: RestrictedExecutionMutation["root"],
  event: string,
  file: ts.SourceFile,
  source: SourceRef,
): RestrictedExecutionMutation[] {
  const output: RestrictedExecutionMutation[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      if (RESTRICTED_MUTATORS.has(method)) {
        output.push({
          root,
          event,
          method,
          source: lineSource(file, node, source),
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(callback);
  return output;
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

  const imports: ScriptImport[] = [];
  const events: ScriptEventSubscription[] = [];
  const dynamicProperties: DynamicPropertyAccess[] = [];
  const restrictedMutations: RestrictedExecutionMutation[] = [];
  const methodCalls = inferScriptMethodCalls(file, source);
  const propertyAccesses = inferScriptPropertyAccesses(file, source);
  const moduleMemberAccesses: ScriptModuleMemberAccess[] = [];
  const importedSymbols: ScriptImportedSymbol[] = [];
  const namedMinecraftBindings = minecraftNamedBindings(file);
  const namespaceMinecraftBindings = minecraftNamespaceBindings(file);
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
  ];

  const visit = (node: ts.Node): void => {
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
      if (namespaceModule && chain.length === 3 && chain[1] && chain[2]) {
        const access: ScriptModuleMemberAccess = {
          module: namespaceModule,
          importedName: chain[1],
          localName: chain[0],
          member: chain[2],
          symbol: `${chain[1]}.${chain[2]}`,
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

    if (ts.isIdentifier(node) && (node.text === "world" || node.text === "system")) {
      capabilities.push({
        capability: node.text === "world" ? "world-access" : "system-access",
        source: lineSource(file, node, source),
      });
    }

    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const chain = propertyAccessChain(node.expression);

      if (chain.at(-1) === "subscribe") {
        const root = chain[0];
        const phase = chain[1];
        const event = chain[2];

        const normalizedRoot: ScriptEventSubscription["root"] =
          root === "world" || root === "system" ? root : "unknown";
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
            if (callback) {
              restrictedMutations.push(
                ...scanRestrictedMutations(
                  callback,
                  normalizedRoot,
                  event,
                  file,
                  source,
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
    methodCalls,
    propertyAccesses,
    moduleMemberAccesses,
    importedSymbols,
    capabilities,
  };
}
