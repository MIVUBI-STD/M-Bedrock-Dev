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
        /^(?:run|runTimeout|runInterval|runJob)$/.test(parent.expression.name.text)
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

function exportedNames(file: ts.SourceFile): Set<string> {
  const output = new Set<string>();

  for (const statement of file.statements) {
    if (ts.isExportDeclaration(statement)) {
      const clause = statement.exportClause;
      if (clause && ts.isNamedExports(clause)) {
        for (const item of clause.elements) {
          output.add(item.name.text);
        }
      }
      continue;
    }

    const exported = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;

    if (hasModifier(statement, ts.SyntaxKind.DefaultKeyword)) {
      output.add("default");
    }

    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement)) &&
      statement.name
    ) {
      output.add(statement.name.text);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          output.add(declaration.name.text);
        }
      }
    }
  }

  return output;
}

export function deriveCrossFileCallEdges(
  modules: readonly ScriptModuleSourceInput[],
): CrossFileCallEdge[] {
  const normalizedModules = new Map(
    modules.map((module) => [normalizePath(module.path), module]),
  );
  const known = new Set(normalizedModules.keys());
  const parsedFiles = new Map<string, ts.SourceFile>();
  const exportsByModule = new Map<string, Set<string>>();

  for (const [path, module] of normalizedModules) {
    const file = ts.createSourceFile(
      path,
      module.text,
      ts.ScriptTarget.Latest,
      true,
      scriptKind(path),
    );
    parsedFiles.set(path, file);
    exportsByModule.set(path, exportedNames(file));
  }

  const output: CrossFileCallEdge[] = [];

  for (const [modulePath, module] of normalizedModules) {
    const file = parsedFiles.get(modulePath)!;
    const imports = new Map<string, {
      moduleSpecifier: string;
      importedName: string;
    }>();

    for (const statement of file.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteralLike(statement.moduleSpecifier) ||
        !statement.moduleSpecifier.text.startsWith(".")
      ) continue;

      const clause = statement.importClause;
      if (clause?.name) {
        imports.set(clause.name.text, {
          moduleSpecifier: statement.moduleSpecifier.text,
          importedName: "default",
        });
      }
      const named = clause?.namedBindings;
      if (named && ts.isNamedImports(named)) {
        for (const element of named.elements) {
          imports.set(element.name.text, {
            moduleSpecifier: statement.moduleSpecifier.text,
            importedName: element.propertyName?.text ?? element.name.text,
          });
        }
      }
    }

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const imported = imports.get(node.expression.text);
        if (imported) {
          const targetModule = resolveRelative(
            modulePath,
            imported.moduleSpecifier,
            known,
          );
          const exportExists =
            targetModule !== undefined &&
            exportsByModule
              .get(targetModule)
              ?.has(imported.importedName) === true;

          output.push({
            callerModule: modulePath,
            callerRegion: region(node, file),
            ...(targetModule ? { targetModule } : {}),
            targetExport: imported.importedName,
            localName: node.expression.text,
            controlFlow: controlFlow(node),
            status: exportExists ? "resolved" : "unresolved",
            source: nodeSource(file, node, {
              ...module.source,
              relativePath: modulePath,
            }),
          });
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
