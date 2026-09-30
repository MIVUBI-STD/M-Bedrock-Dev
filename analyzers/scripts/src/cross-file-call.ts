import ts from "typescript";
import type { SourceRef } from "../../../packages/project-model/src/index.js";

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
  localExports: Set<string>;
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

function controlFlow(
  node: ts.Node,
): CrossFileCallEdge["controlFlow"] {
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
  const localExports = new Set<string>();
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
          localExports.add(item.name.text);
        }
      }
      continue;
    }

    const exported =
      hasModifier(statement, ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;

    if (hasModifier(statement, ts.SyntaxKind.DefaultKeyword)) {
      localExports.add("default");
    }

    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement)) &&
      statement.name
    ) {
      localExports.add(statement.name.text);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          localExports.add(declaration.name.text);
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

  if (info.localExports.has(exportName)) {
    return {
      modulePath,
      exportName,
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
  const normalizedModules = new Map(
    modules.map((module) => [
      normalizePath(module.path),
      module,
    ]),
  );
  const known = new Set(normalizedModules.keys());
  const parsedFiles = new Map<string, ts.SourceFile>();
  const exportsByModule =
    new Map<string, ParsedModuleExports>();

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
  }

  const output: CrossFileCallEdge[] = [];

  for (const [modulePath, module] of normalizedModules) {
    const file = parsedFiles.get(modulePath)!;
    const directImports = new Map<string, {
      moduleSpecifier: string;
      importedName: string;
    }>();
    const namespaceImports = new Map<string, string>();

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

      if (clause?.name) {
        directImports.set(clause.name.text, {
          moduleSpecifier,
          importedName: "default",
        });
      }

      const named = clause?.namedBindings;
      if (named && ts.isNamedImports(named)) {
        for (const element of named.elements) {
          directImports.set(element.name.text, {
            moduleSpecifier,
            importedName:
              element.propertyName?.text ??
              element.name.text,
          });
        }
      } else if (named && ts.isNamespaceImport(named)) {
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
        localName: imported.localName,
        controlFlow: controlFlow(node),
        status: target ? "resolved" : "unresolved",
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
          if (imported) {
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
          if (moduleSpecifier) {
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
