import type {
  SafeConfigEnvironment,
  SafeConfigExpression,
  SafeConfigFunction,
  SafeConfigValue,
} from "../../../packages/behavior-model/src/index.js";
import {
  evaluateSafeConfig,
} from "../../../packages/behavior-model/src/index.js";
import type {
  SourceRef,
} from "../../../packages/project-model/src/index.js";
import {
  compileScriptSafeConfig,
} from "./safe-config-compiler.js";

export interface ScriptSafeConfigModuleInput {
  path: string;
  text: string;
  source: SourceRef;
}

export interface ScriptSafeConfigProjectDiagnostic {
  kind:
    | "missing-module"
    | "missing-export"
    | "duplicate-module"
    | "duplicate-export";
  modulePath: string;
  symbol?: string;
  detail: string;
}

export interface ScriptSafeConfigProject {
  environment: SafeConfigEnvironment;
  exports: Readonly<Record<string, SafeConfigExpression>>;
  diagnostics: readonly ScriptSafeConfigProjectDiagnostic[];
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

function resolveRelativeModule(
  importerPath: string,
  specifier: string,
  knownPaths: ReadonlySet<string>,
): string | undefined {
  const base = normalizePath(
    [dirname(importerPath), specifier].filter(Boolean).join("/"),
  );
  const candidates = [
    base,
    base + ".ts",
    base + ".tsx",
    base + ".js",
    base + ".jsx",
    base + "/index.ts",
    base + "/index.tsx",
    base + "/index.js",
    base + "/index.jsx",
  ];
  return candidates.find((candidate) => knownPaths.has(candidate));
}

function prefixed(modulePath: string, name: string): string {
  return modulePath + "::" + name;
}

function rewriteExpression(
  expression: SafeConfigExpression,
  names: ReadonlyMap<string, string>,
): SafeConfigExpression {
  if (expression.kind === "ref") {
    return {
      ...expression,
      name: names.get(expression.name) ?? expression.name,
    };
  }
  if (
    expression.kind === "literal"
  ) {
    return expression;
  }
  if (expression.kind === "array") {
    return {
      ...expression,
      items: expression.items.map((item) =>
        rewriteExpression(item, names)
      ),
    };
  }
  if (expression.kind === "array-compose") {
    return {
      ...expression,
      parts: expression.parts.map((part) => ({
        ...part,
        expression: rewriteExpression(part.expression, names),
      })),
    };
  }
  if (expression.kind === "object") {
    return {
      ...expression,
      entries: Object.fromEntries(
        Object.entries(expression.entries).map(([key, value]) => [
          key,
          rewriteExpression(value, names),
        ]),
      ),
    };
  }
  if (expression.kind === "object-merge") {
    return {
      ...expression,
      parts: expression.parts.map((part) =>
        rewriteExpression(part, names)
      ),
    };
  }
  if (
    expression.kind === "binary" ||
    expression.kind === "compare" ||
    expression.kind === "logical"
  ) {
    return {
      ...expression,
      left: rewriteExpression(expression.left, names),
      right: rewriteExpression(expression.right, names),
    };
  }
  if (expression.kind === "conditional") {
    return {
      ...expression,
      condition: rewriteExpression(expression.condition, names),
      whenTrue: rewriteExpression(expression.whenTrue, names),
      whenFalse: rewriteExpression(expression.whenFalse, names),
    };
  }
  if (expression.kind === "get") {
    return {
      ...expression,
      object: rewriteExpression(expression.object, names),
    };
  }
  if (expression.kind === "intrinsic") {
    return {
      ...expression,
      args: expression.args.map((arg) =>
        rewriteExpression(arg, names)
      ),
    };
  }
  if (expression.kind === "map") {
    const local = new Map(names);
    local.delete(expression.itemName);
    if (expression.indexName) local.delete(expression.indexName);
    return {
      ...expression,
      source: rewriteExpression(expression.source, names),
      body: rewriteExpression(expression.body, local),
    };
  }
  if (expression.kind === "array-from") {
    const local = new Map(names);
    local.delete(expression.indexName);
    return {
      ...expression,
      length: rewriteExpression(expression.length, names),
      body: rewriteExpression(expression.body, local),
    };
  }
  return {
    ...expression,
    name: names.get(expression.name) ?? expression.name,
    args: expression.args.map((arg) =>
      rewriteExpression(arg, names)
    ),
  };
}

function rewriteFunction(
  fn: SafeConfigFunction,
  names: ReadonlyMap<string, string>,
): SafeConfigFunction {
  const local = new Map(names);
  for (const param of fn.params) local.delete(param);
  return {
    params: fn.params,
    body: rewriteExpression(fn.body, local),
  };
}

export function linkScriptSafeConfigProject(
  modules: readonly ScriptSafeConfigModuleInput[],
): ScriptSafeConfigProject {
  const diagnostics: ScriptSafeConfigProjectDiagnostic[] = [];
  const compiled = new Map<
    string,
    ReturnType<typeof compileScriptSafeConfig>
  >();

  for (const module of modules) {
    const path = normalizePath(module.path);
    if (compiled.has(path)) {
      diagnostics.push({
        kind: "duplicate-module",
        modulePath: path,
        detail: "Multiple safe-config inputs resolve to the same normalized path.",
      });
      continue;
    }
    compiled.set(
      path,
      compileScriptSafeConfig(module.text, {
        ...module.source,
        relativePath: path,
      }),
    );
  }

  const knownPaths = new Set(compiled.keys());
  const bindings: Record<string, SafeConfigExpression> = {};
  const functions: Record<string, SafeConfigFunction> = {};
  const projectExports: Record<string, SafeConfigExpression> = {};

  for (const [modulePath, unit] of compiled) {
    const names = new Map<string, string>();

    for (const binding of unit.bindings) {
      names.set(binding.name, prefixed(modulePath, binding.name));
    }
    for (const fn of unit.functions) {
      names.set(fn.name, prefixed(modulePath, fn.name));
    }

    for (const imported of unit.imports) {
      const targetPath = resolveRelativeModule(
        modulePath,
        imported.module,
        knownPaths,
      );
      if (!targetPath) {
        diagnostics.push({
          kind: "missing-module",
          modulePath,
          symbol: imported.localName,
          detail: `Unable to resolve ${imported.module} from ${modulePath}.`,
        });
        continue;
      }

      const target = compiled.get(targetPath)!;
      const targetExport = target.exports.find(
        (item) => item.exportedName === imported.importedName,
      );
      if (!targetExport) {
        diagnostics.push({
          kind: "missing-export",
          modulePath: targetPath,
          symbol: imported.importedName,
          detail: `Module ${targetPath} does not export ${imported.importedName}.`,
        });
        continue;
      }
      names.set(
        imported.localName,
        prefixed(targetPath, targetExport.localName),
      );
    }

    for (const binding of unit.bindings) {
      bindings[prefixed(modulePath, binding.name)] =
        rewriteExpression(binding.expression, names);
    }
    for (const fn of unit.functions) {
      functions[prefixed(modulePath, fn.name)] =
        rewriteFunction(fn.definition, names);
    }

    for (const exported of unit.exports) {
      const key = modulePath + "#" + exported.exportedName;
      if (projectExports[key]) {
        diagnostics.push({
          kind: "duplicate-export",
          modulePath,
          symbol: exported.exportedName,
          detail: `Duplicate export key: ${key}.`,
        });
        continue;
      }
      projectExports[key] = {
        kind: "ref",
        name: prefixed(modulePath, exported.localName),
      };
    }
  }

  return {
    environment: {
      bindings,
      functions,
    },
    exports: projectExports,
    diagnostics,
  };
}

export function evaluateScriptSafeConfigExport(
  project: ScriptSafeConfigProject,
  modulePath: string,
  exportName: string,
): SafeConfigValue {
  const key = normalizePath(modulePath) + "#" + exportName;
  const expression = project.exports[key];
  if (!expression) {
    throw new Error(`Unknown linked safe-config export: ${key}`);
  }
  return evaluateSafeConfig(expression, project.environment);
}
