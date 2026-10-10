import ts from "typescript";
import type { SourceRef } from "../../../../packages/project-model/src/index.js";

export interface ScriptModuleSourceInput {
  path: string;
  text: string;
  source: SourceRef;
}

export interface CrossFileCallEdge {
  callerModule: string;
  callerRegion: string;
  targetModule?: string;
  targetExport: string;
  /** Exact declared executable region; omitted for non-callable/ambiguous exports. */
  targetRegion?: string;
  localName: string;
  controlFlow: "unconditional" | "conditional" | "deferred";
  status: "resolved" | "unresolved";
  source: SourceRef;
}

interface ExportTarget {
  modulePath: string;
  exportName: string;
}

interface ReExportBinding {
  exportedName: string;
  importedName: string;
  moduleSpecifier: string;
}

interface ParsedModuleExports {
  localExports: ReadonlyMap<string, string>;
  namedReExports: readonly ReExportBinding[];
  starReExports: readonly string[];
}

function normalizePath(value: string): string {
  const parts: string[] = [];
  for (const part of value.replaceAll("\\", "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

function dirname(value: string): string {
  const normalized = normalizePath(value);
  const index = normalized.lastIndexOf("/");
  return index < 0 ? "" : normalized.slice(0, index);
}

function resolveRelative(
  importer: string,
  specifier: string,
  known: ReadonlySet<string>,
): string | undefined {
  const base = normalizePath(
    [dirname(importer), specifier].filter(Boolean).join("/"),
  );
  const stem = base.replace(/\.(?:[cm]?[jt]sx?)$/i, "");
  return [
    base,
    stem,
    stem + ".ts",
    stem + ".tsx",
    stem + ".js",
    stem + ".jsx",
    stem + "/index.ts",
    stem + "/index.tsx",
    stem + "/index.js",
    stem + "/index.jsx",
  ].find((candidate) => known.has(candidate));
}

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
  const start = file.getLineAndCharacterOfPosition(node.getStart(file));
  const end = file.getLineAndCharacterOfPosition(node.getEnd());
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

function region(node: ts.Node, file: ts.SourceFile): string {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) {
      return "function:" + current.name.text;
    }
    if (ts.isMethodDeclaration(current)) {
      const name = current.name;
      if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) {
        return "function:" + name.text;
      }
    }
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const start = file.getLineAndCharacterOfPosition(current.getStart(file));
      return "callback@" + (start.line + 1) + ":" + (start.character + 1);
    }
    current = current.parent;
  }
  return "module";
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

function controlFlow(
  node: ts.Node,
): CrossFileCallEdge["controlFlow"] {
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

    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
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

    if (ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current)) {
      return "unconditional";
    }

    current = current.parent;
  }
  return "unconditional";
}

function hasModifier(
  node: ts.Node & { modifiers?: ts.NodeArray<ts.ModifierLike> },
  kind: ts.SyntaxKind,
): boolean {
  return node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
}

function moduleExports(
  file: ts.SourceFile,
): ParsedModuleExports {
  const localExports = new Map<string, string>();
  const namedReExports: ReExportBinding[] = [];
  const starReExports: string[] = [];

  for (const statement of file.statements) {
    if (ts.isExportDeclaration(statement)) {
      const moduleSpecifier =
        statement.moduleSpecifier &&
        ts.isStringLiteralLike(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : undefined;
      const clause = statement.exportClause;

      if (moduleSpecifier && clause && ts.isNamedExports(clause)) {
        for (const item of clause.elements) {
          namedReExports.push({
            exportedName: item.name.text,
            importedName:
              item.propertyName?.text ?? item.name.text,
            moduleSpecifier,
          });
        }
        continue;
      }

      if (moduleSpecifier && !clause) {
        starReExports.push(moduleSpecifier);
        continue;
      }

      if (!moduleSpecifier && clause && ts.isNamedExports(clause)) {
        for (const item of clause.elements) {
          localExports.set(
            item.name.text,
            item.propertyName?.text ?? item.name.text,
          );
        }
      }
      continue;
    }

    const exported =
      hasModifier(statement, ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;

    const isDefault =
      hasModifier(statement, ts.SyntaxKind.DefaultKeyword);

    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement))
    ) {
      const localName =
        statement.name?.text ?? "default";
      if (isDefault) {
        localExports.set("default", localName);
      } else if (statement.name) {
        localExports.set(
          statement.name.text,
          statement.name.text,
        );
      }
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          localExports.set(
            declaration.name.text,
            declaration.name.text,
          );
        }
      }
    }
  }

  return {
    localExports,
    namedReExports,
    starReExports,
  };
}

/**
 * Executable export identity is stronger than an exported symbol name:
 * invoking an exported class, object, or mutable binding is not evidence of
 * a statically resolvable function call.
 */
function callableRegions(file: ts.SourceFile): ReadonlyMap<string, string> {
  const declarations = new Map<string, string[]>();
  const add = (name: string, executionRegion: string): void => {
    declarations.set(name, [...(declarations.get(name) ?? []), executionRegion]);
  };
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      add(statement.name.text, "function:" + statement.name.text);
    }
    if (ts.isVariableStatement(statement) &&
        (statement.declarationList.flags & ts.NodeFlags.Const)) {
      for (const declaration of statement.declarationList.declarations) {
        const initializer = declaration.initializer;
        if (!ts.isIdentifier(declaration.name) || !initializer ||
            !(ts.isFunctionExpression(initializer) || ts.isArrowFunction(initializer))) continue;
        const position = file.getLineAndCharacterOfPosition(initializer.getStart(file));
        add(declaration.name.text,
          "callback@" + (position.line + 1) + ":" + (position.character + 1));
      }
    }
  }
  return new Map([...declarations]
    .filter(([, regions]) => regions.length === 1)
    .map(([name, regions]) => [name, regions[0]!]));
}

function packScope(path: string): string | undefined {
  const segments = normalizePath(path).split("/");
  return segments.length > 1 &&
    (segments[0] === "behavior_packs" || segments[0] === "resource_packs")
    ? segments.slice(0, 2).join("/")
    : undefined;
}

function resolveExportTarget(
  modulePath: string,
  exportName: string,
  exportsByModule: ReadonlyMap<string, ParsedModuleExports>,
  knownPaths: ReadonlySet<string>,
  stack = new Set<string>(),
): ExportTarget | undefined {
  const key = modulePath + "#" + exportName;
  if (stack.has(key)) return undefined;

  const info = exportsByModule.get(modulePath);
  if (!info) return undefined;

  const localTarget =
    info.localExports.get(exportName);
  if (localTarget !== undefined) {
    return {
      modulePath,
      exportName: localTarget,
    };
  }

  const nextStack = new Set(stack);
  nextStack.add(key);

  const named = info.namedReExports.find(
    (item) => item.exportedName === exportName,
  );
  if (named) {
    const targetModule = resolveRelative(
      modulePath,
      named.moduleSpecifier,
      knownPaths,
    );
    if (!targetModule) return undefined;
    return resolveExportTarget(
      targetModule,
      named.importedName,
      exportsByModule,
      knownPaths,
      nextStack,
    );
  }

  const starTargets = info.starReExports.flatMap((specifier) => {
    const targetModule = resolveRelative(
      modulePath,
      specifier,
      knownPaths,
    );
    if (!targetModule) return [];
    const resolved = resolveExportTarget(
      targetModule,
      exportName,
      exportsByModule,
      knownPaths,
      nextStack,
    );
    return resolved ? [resolved] : [];
  });

  const unique = new Map(
    starTargets.map((item) => [
      item.modulePath + "#" + item.exportName,
      item,
    ]),
  );

  return unique.size === 1
    ? [...unique.values()][0]
    : undefined;
}

export function deriveCrossFileCallEdges(
  modules: readonly ScriptModuleSourceInput[],
): CrossFileCallEdge[] {
  // Do not let a duplicate path from another source silently replace an
  // authoritative selected-artifact module.
  const counts = new Map<string, number>();
  for (const module of modules) {
    const normalized = normalizePath(module.path);
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  const normalizedModules = new Map(modules
    .filter(module => counts.get(normalizePath(module.path)) === 1)
    .map(module => [normalizePath(module.path), module]));
  const known = new Set(normalizedModules.keys());
  const parsedFiles = new Map<string, ts.SourceFile>();
  const exportsByModule =
    new Map<string, ParsedModuleExports>();
  const callableByModule = new Map<string, ReadonlyMap<string, string>>();

  for (const [path, module] of normalizedModules) {
    const file = ts.createSourceFile(
      path,
      module.text,
      ts.ScriptTarget.Latest,
      true,
      scriptKind(path),
    );
    parsedFiles.set(path, file);
    exportsByModule.set(path, moduleExports(file));
    callableByModule.set(path, callableRegions(file));
  }

  const output: CrossFileCallEdge[] = [];

  for (const [modulePath, module] of normalizedModules) {
    const file = parsedFiles.get(modulePath)!;
    const directImports = new Map<string, {
      moduleSpecifier: string;
      importedName: string;
    }>();
    const namespaceImports = new Map<string, string>();

    const bindsName = (binding: ts.BindingName, name: string): boolean =>
      ts.isIdentifier(binding) ? binding.text === name :
      binding.elements.some(element =>
        ts.isBindingElement(element) && bindsName(element.name, name));
    const isShadowed = (use: ts.Identifier): boolean => {
      let current: ts.Node | undefined = use.parent;
      while (current && current !== file) {
        if (ts.isFunctionLike(current) && current.parameters.some(parameter =>
            bindsName(parameter.name, use.text))) return true;
        if (ts.isCatchClause(current) && current.variableDeclaration &&
            bindsName(current.variableDeclaration.name, use.text)) return true;
        if ((ts.isForStatement(current) || ts.isForInStatement(current) ||
            ts.isForOfStatement(current)) && current.initializer &&
            ts.isVariableDeclarationList(current.initializer) &&
            current.initializer.declarations.some(declaration =>
              bindsName(declaration.name, use.text))) return true;
        if (ts.isBlock(current) &&
            current.statements.some(statement =>
              (ts.isVariableStatement(statement) &&
                statement.declarationList.declarations.some(declaration =>
                  bindsName(declaration.name, use.text))) ||
              (ts.isFunctionDeclaration(statement) &&
                statement.name?.text === use.text))) return true;
        current = current.parent;
      }
      return false;
    };

    for (const statement of file.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteralLike(statement.moduleSpecifier) ||
        !statement.moduleSpecifier.text.startsWith(".")
      ) {
        continue;
      }

      const moduleSpecifier =
        statement.moduleSpecifier.text;
      const clause = statement.importClause;

      if (clause?.name && !clause.isTypeOnly) {
        directImports.set(clause.name.text, {
          moduleSpecifier,
          importedName: "default",
        });
      }

      const named = clause?.namedBindings;
      if (named && ts.isNamedImports(named)) {
        for (const element of named.elements) {
          if (clause?.isTypeOnly || element.isTypeOnly) continue;
          directImports.set(element.name.text, {
            moduleSpecifier,
            importedName:
              element.propertyName?.text ??
              element.name.text,
          });
        }
      } else if (named && !clause?.isTypeOnly && ts.isNamespaceImport(named)) {
        namespaceImports.set(
          named.name.text,
          moduleSpecifier,
        );
      }
    }

    const appendEdge = (
      node: ts.CallExpression,
      imported: {
        moduleSpecifier: string;
        importedName: string;
        localName: string;
      },
    ): void => {
      const importedModule = resolveRelative(
        modulePath,
        imported.moduleSpecifier,
        known,
      );
      const target =
        importedModule === undefined
          ? undefined
          : resolveExportTarget(
              importedModule,
              imported.importedName,
              exportsByModule,
              known,
            );
      const targetSource = target === undefined
        ? undefined : normalizedModules.get(target.modulePath)?.source;
      const sameOwner = targetSource !== undefined &&
        targetSource.artifactId === module.source.artifactId &&
        packScope(modulePath) === packScope(target!.modulePath);
      const targetRegion = sameOwner && target
        ? callableByModule.get(target.modulePath)?.get(target.exportName)
        : undefined;

      output.push({
        callerModule: modulePath,
        callerRegion: region(node, file),
        ...(target
          ? { targetModule: target.modulePath }
          : importedModule
            ? { targetModule: importedModule }
            : {}),
        targetExport:
          target?.exportName ??
          imported.importedName,
        ...(targetRegion === undefined ? {} : { targetRegion }),
        localName: imported.localName,
        controlFlow: controlFlow(node),
        status: targetRegion ? "resolved" : "unresolved",
        source: nodeSource(file, node, {
          ...module.source,
          relativePath: modulePath,
        }),
      });
    };

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        if (ts.isIdentifier(node.expression)) {
          const imported =
            directImports.get(node.expression.text);
          if (imported && !isShadowed(node.expression)) {
            appendEdge(node, {
              ...imported,
              localName: node.expression.text,
            });
          }
        } else if (
          ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression)
        ) {
          const namespace =
            node.expression.expression.text;
          const moduleSpecifier =
            namespaceImports.get(namespace);
          if (moduleSpecifier && !isShadowed(node.expression.expression)) {
            appendEdge(node, {
              moduleSpecifier,
              importedName:
                node.expression.name.text,
              localName:
                namespace +
                "." +
                node.expression.name.text,
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(file);
  }

  return output.sort((a, b) =>
    a.callerModule.localeCompare(b.callerModule) ||
    a.callerRegion.localeCompare(b.callerRegion) ||
    a.localName.localeCompare(b.localName)
  );
}
