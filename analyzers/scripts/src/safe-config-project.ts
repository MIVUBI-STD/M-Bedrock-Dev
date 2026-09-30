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
    | "ambiguous-export"
    | "duplicate-module"
    | "duplicate-export";
  modulePath: string;
  symbol?: string;
  detail: string;
}

export interface ScriptSafeConfigProject {
  environment: SafeConfigEnvironment;
  exports:
    Readonly<
      Record<
        string,
        SafeConfigExpression
      >
    >;
  diagnostics:
    readonly ScriptSafeConfigProjectDiagnostic[];
}

type CompiledUnit =
  ReturnType<
    typeof compileScriptSafeConfig
  >;

interface ResolvedExportTarget {
  modulePath: string;
  localName: string;
}

type ExportResolution =
  | {
      status: "resolved";
      target:
        ResolvedExportTarget;
    }
  | {
      status:
        | "missing-module"
        | "missing-export"
        | "ambiguous-export";
      detail: string;
    };

function normalizePath(
  value: string,
): string {
  const parts: string[] = [];
  for (
    const part of
      value
        .replaceAll("\\", "/")
        .split("/")
  ) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

function dirname(
  value: string,
): string {
  const normalized =
    normalizePath(value);
  const index =
    normalized.lastIndexOf("/");
  return index < 0
    ? ""
    : normalized.slice(0, index);
}

function resolveRelativeModule(
  importerPath: string,
  specifier: string,
  knownPaths:
    ReadonlySet<string>,
): string | undefined {
  const base =
    normalizePath(
      [
        dirname(importerPath),
        specifier,
      ]
        .filter(Boolean)
        .join("/"),
    );
  const extensionless =
    base.replace(
      /\.(?:[cm]?[jt]sx?)$/i,
      "",
    );
  const candidates = [
    base,
    extensionless,
    extensionless + ".ts",
    extensionless + ".tsx",
    extensionless + ".js",
    extensionless + ".jsx",
    extensionless + "/index.ts",
    extensionless + "/index.tsx",
    extensionless + "/index.js",
    extensionless + "/index.jsx",
  ];
  return candidates.find(
    (candidate) =>
      knownPaths.has(candidate),
  );
}

function prefixed(
  modulePath: string,
  name: string,
): string {
  return modulePath + "::" + name;
}

function rewriteExpression(
  expression: SafeConfigExpression,
  names:
    ReadonlyMap<string, string>,
): SafeConfigExpression {
  if (
    expression.kind === "ref"
  ) {
    return {
      ...expression,
      name:
        names.get(
          expression.name,
        ) ??
        expression.name,
    };
  }

  if (
    expression.kind === "literal"
  ) {
    return expression;
  }

  if (
    expression.kind === "array"
  ) {
    return {
      ...expression,
      items:
        expression.items.map(
          (item) =>
            rewriteExpression(
              item,
              names,
            ),
        ),
    };
  }

  if (
    expression.kind ===
    "array-compose"
  ) {
    return {
      ...expression,
      parts:
        expression.parts.map(
          (part) => ({
            ...part,
            expression:
              rewriteExpression(
                part.expression,
                names,
              ),
          }),
        ),
    };
  }

  if (
    expression.kind === "object"
  ) {
    return {
      ...expression,
      entries:
        Object.fromEntries(
          Object.entries(
            expression.entries,
          ).map(
            ([key, value]) => [
              key,
              rewriteExpression(
                value,
                names,
              ),
            ],
          ),
        ),
    };
  }

  if (
    expression.kind ===
    "object-merge"
  ) {
    return {
      ...expression,
      parts:
        expression.parts.map(
          (part) =>
            rewriteExpression(
              part,
              names,
            ),
        ),
    };
  }

  if (
    expression.kind ===
      "binary" ||
    expression.kind ===
      "compare" ||
    expression.kind ===
      "logical"
  ) {
    return {
      ...expression,
      left:
        rewriteExpression(
          expression.left,
          names,
        ),
      right:
        rewriteExpression(
          expression.right,
          names,
        ),
    };
  }

  if (
    expression.kind ===
    "conditional"
  ) {
    return {
      ...expression,
      condition:
        rewriteExpression(
          expression.condition,
          names,
        ),
      whenTrue:
        rewriteExpression(
          expression.whenTrue,
          names,
        ),
      whenFalse:
        rewriteExpression(
          expression.whenFalse,
          names,
        ),
    };
  }

  if (
    expression.kind === "get"
  ) {
    return {
      ...expression,
      object:
        rewriteExpression(
          expression.object,
          names,
        ),
    };
  }

  if (
    expression.kind ===
    "intrinsic"
  ) {
    return {
      ...expression,
      args:
        expression.args.map(
          (arg) =>
            rewriteExpression(
              arg,
              names,
            ),
        ),
    };
  }

  if (
    expression.kind === "map"
  ) {
    const local =
      new Map(names);
    local.delete(
      expression.itemName,
    );
    if (
      expression.indexName
    ) {
      local.delete(
        expression.indexName,
      );
    }
    return {
      ...expression,
      source:
        rewriteExpression(
          expression.source,
          names,
        ),
      body:
        rewriteExpression(
          expression.body,
          local,
        ),
    };
  }

  if (
    expression.kind ===
    "array-from"
  ) {
    const local =
      new Map(names);
    local.delete(
      expression.indexName,
    );
    return {
      ...expression,
      length:
        rewriteExpression(
          expression.length,
          names,
        ),
      body:
        rewriteExpression(
          expression.body,
          local,
        ),
    };
  }

  return {
    ...expression,
    name:
      names.get(
        expression.name,
      ) ??
      expression.name,
    args:
      expression.args.map(
        (arg) =>
          rewriteExpression(
            arg,
            names,
          ),
      ),
  };
}

function rewriteFunction(
  fn: SafeConfigFunction,
  names:
    ReadonlyMap<string, string>,
): SafeConfigFunction {
  const local =
    new Map(names);
  for (
    const param of fn.params
  ) {
    local.delete(param);
  }
  return {
    params: fn.params,
    body:
      rewriteExpression(
        fn.body,
        local,
      ),
  };
}

function collectExportNames(
  modulePath: string,
  compiled:
    ReadonlyMap<
      string,
      CompiledUnit
    >,
  knownPaths:
    ReadonlySet<string>,
  stack =
    new Set<string>(),
): Set<string> {
  if (stack.has(modulePath)) {
    return new Set();
  }

  const unit =
    compiled.get(modulePath);
  if (!unit) {
    return new Set();
  }

  const next =
    new Set(stack);
  next.add(modulePath);

  const names =
    new Set(
      unit.exports.map(
        (item) =>
          item.exportedName,
      ),
    );

  for (
    const reExport of
      unit.reExports
  ) {
    if (!reExport.exportAll) {
      if (
        reExport.exportedName
      ) {
        names.add(
          reExport.exportedName,
        );
      }
      continue;
    }

    const targetPath =
      resolveRelativeModule(
        modulePath,
        reExport.module,
        knownPaths,
      );
    if (!targetPath) {
      continue;
    }

    for (
      const name of
        collectExportNames(
          targetPath,
          compiled,
          knownPaths,
          next,
        )
    ) {
      if (name !== "default") {
        names.add(name);
      }
    }
  }

  return names;
}

function resolveProjectExport(
  modulePath: string,
  exportName: string,
  compiled:
    ReadonlyMap<
      string,
      CompiledUnit
    >,
  knownPaths:
    ReadonlySet<string>,
  stack =
    new Set<string>(),
): ExportResolution {
  const key =
    modulePath +
    "#" +
    exportName;

  if (stack.has(key)) {
    return {
      status:
        "missing-export",
      detail:
        "Cyclic re-export chain cannot resolve " +
        key +
        ".",
    };
  }

  const unit =
    compiled.get(modulePath);
  if (!unit) {
    return {
      status:
        "missing-module",
      detail:
        "Module is unavailable: " +
        modulePath +
        ".",
    };
  }

  const localMatches =
    unit.exports.filter(
      (item) =>
        item.exportedName ===
        exportName,
    );

  if (
    localMatches.length === 1
  ) {
    return {
      status: "resolved",
      target: {
        modulePath,
        localName:
          localMatches[0]!
            .localName,
      },
    };
  }

  if (
    localMatches.length > 1
  ) {
    return {
      status:
        "ambiguous-export",
      detail:
        "Multiple local exports provide " +
        exportName +
        " in " +
        modulePath +
        ".",
    };
  }

  const next =
    new Set(stack);
  next.add(key);

  const direct =
    unit.reExports.filter(
      (item) =>
        !item.exportAll &&
        item.exportedName ===
          exportName,
    );

  if (direct.length > 1) {
    return {
      status:
        "ambiguous-export",
      detail:
        "Multiple named re-exports provide " +
        exportName +
        " in " +
        modulePath +
        ".",
    };
  }

  if (direct.length === 1) {
    const item = direct[0]!;
    const targetPath =
      resolveRelativeModule(
        modulePath,
        item.module,
        knownPaths,
      );

    if (!targetPath) {
      return {
        status:
          "missing-module",
        detail:
          "Unable to resolve " +
          item.module +
          " from " +
          modulePath +
          ".",
      };
    }

    return resolveProjectExport(
      targetPath,
      item.importedName ??
        exportName,
      compiled,
      knownPaths,
      next,
    );
  }

  if (exportName === "default") {
    return {
      status:
        "missing-export",
      detail:
        "Module " +
        modulePath +
        " does not export default.",
    };
  }

  const starTargets:
    ResolvedExportTarget[] = [];

  for (
    const item of
      unit.reExports.filter(
        (candidate) =>
          candidate.exportAll,
      )
  ) {
    const targetPath =
      resolveRelativeModule(
        modulePath,
        item.module,
        knownPaths,
      );
    if (!targetPath) {
      continue;
    }

    const resolution =
      resolveProjectExport(
        targetPath,
        exportName,
        compiled,
        knownPaths,
        next,
      );

    if (
      resolution.status ===
      "resolved"
    ) {
      starTargets.push(
        resolution.target,
      );
    }
  }

  const unique =
    new Map(
      starTargets.map(
        (item) => [
          item.modulePath +
            "::" +
            item.localName,
          item,
        ],
      ),
    );

  if (unique.size === 1) {
    return {
      status: "resolved",
      target:
        [...unique.values()][0]!,
    };
  }

  if (unique.size > 1) {
    return {
      status:
        "ambiguous-export",
      detail:
        "Star re-exports expose multiple implementations of " +
        exportName +
        " from " +
        modulePath +
        ".",
    };
  }

  return {
    status: "missing-export",
    detail:
      "Module " +
      modulePath +
      " does not export " +
      exportName +
      ".",
  };
}

function pushResolutionDiagnostic(
  diagnostics:
    ScriptSafeConfigProjectDiagnostic[],
  modulePath: string,
  symbol: string,
  resolution:
    Exclude<
      ExportResolution,
      { status: "resolved" }
    >,
): void {
  diagnostics.push({
    kind: resolution.status,
    modulePath,
    symbol,
    detail:
      resolution.detail,
  });
}

export function linkScriptSafeConfigProject(
  modules:
    readonly ScriptSafeConfigModuleInput[],
): ScriptSafeConfigProject {
  const diagnostics:
    ScriptSafeConfigProjectDiagnostic[] =
      [];
  const compiled =
    new Map<
      string,
      CompiledUnit
    >();

  for (const module of modules) {
    const path =
      normalizePath(module.path);

    if (compiled.has(path)) {
      diagnostics.push({
        kind:
          "duplicate-module",
        modulePath: path,
        detail:
          "Multiple safe-config inputs resolve to the same normalized path.",
      });
      continue;
    }

    compiled.set(
      path,
      compileScriptSafeConfig(
        module.text,
        {
          ...module.source,
          relativePath: path,
        },
      ),
    );
  }

  const knownPaths =
    new Set(
      compiled.keys(),
    );

  for (
    const [modulePath, unit] of
      compiled
  ) {
    for (
      const reExport of
        unit.reExports
    ) {
      const targetPath =
        resolveRelativeModule(
          modulePath,
          reExport.module,
          knownPaths,
        );
      if (!targetPath) {
        diagnostics.push({
          kind: "missing-module",
          modulePath,
          ...(reExport.exportedName ===
          undefined
            ? {}
            : {
                symbol:
                  reExport.exportedName,
              }),
          detail:
            "Unable to resolve " +
            reExport.module +
            " from " +
            modulePath +
            ".",
        });
      }
    }
  }

  const bindings:
    Record<
      string,
      SafeConfigExpression
    > = {};
  const functions:
    Record<
      string,
      SafeConfigFunction
    > = {};
  const projectExports:
    Record<
      string,
      SafeConfigExpression
    > = {};

  for (
    const [modulePath, unit] of
      compiled
  ) {
    const names =
      new Map<
        string,
        string
      >();

    for (
      const binding of
        unit.bindings
    ) {
      names.set(
        binding.name,
        prefixed(
          modulePath,
          binding.name,
        ),
      );
    }

    for (
      const fn of
        unit.functions
    ) {
      names.set(
        fn.name,
        prefixed(
          modulePath,
          fn.name,
        ),
      );
    }

    for (
      const imported of
        unit.imports
    ) {
      const targetPath =
        resolveRelativeModule(
          modulePath,
          imported.module,
          knownPaths,
        );

      if (!targetPath) {
        diagnostics.push({
          kind:
            "missing-module",
          modulePath,
          symbol:
            imported.localName,
          detail:
            "Unable to resolve " +
            imported.module +
            " from " +
            modulePath +
            ".",
        });
        continue;
      }

      if (
        imported.kind ===
        "namespace"
      ) {
        const entries:
          Record<
            string,
            SafeConfigExpression
          > = {};

        for (
          const exportName of
            collectExportNames(
              targetPath,
              compiled,
              knownPaths,
            )
        ) {
          const resolution =
            resolveProjectExport(
              targetPath,
              exportName,
              compiled,
              knownPaths,
            );

          if (
            resolution.status !==
            "resolved"
          ) {
            pushResolutionDiagnostic(
              diagnostics,
              targetPath,
              exportName,
              resolution,
            );
            continue;
          }

          const targetUnit =
            compiled.get(
              resolution.target
                .modulePath,
            );
          const valueExport =
            targetUnit?.bindings.some(
              (binding) =>
                binding.name ===
                resolution.target
                  .localName,
            ) === true;

          if (!valueExport) {
            continue;
          }

          entries[exportName] = {
            kind: "ref",
            name: prefixed(
              resolution.target
                .modulePath,
              resolution.target
                .localName,
            ),
          };
        }

        const namespaceName =
          prefixed(
            modulePath,
            "$namespace:" +
              imported.localName,
          );

        bindings[
          namespaceName
        ] = {
          kind: "object",
          entries,
        };
        names.set(
          imported.localName,
          namespaceName,
        );
        continue;
      }

      const resolution =
        resolveProjectExport(
          targetPath,
          imported.importedName,
          compiled,
          knownPaths,
        );

      if (
        resolution.status !==
        "resolved"
      ) {
        pushResolutionDiagnostic(
          diagnostics,
          targetPath,
          imported.importedName,
          resolution,
        );
        continue;
      }

      names.set(
        imported.localName,
        prefixed(
          resolution.target
            .modulePath,
          resolution.target
            .localName,
        ),
      );
    }

    for (
      const binding of
        unit.bindings
    ) {
      bindings[
        prefixed(
          modulePath,
          binding.name,
        )
      ] =
        rewriteExpression(
          binding.expression,
          names,
        );
    }

    for (
      const fn of
        unit.functions
    ) {
      functions[
        prefixed(
          modulePath,
          fn.name,
        )
      ] =
        rewriteFunction(
          fn.definition,
          names,
        );
    }
  }

  for (
    const modulePath of
      [...compiled.keys()].sort()
  ) {
    const exportNames =
      [
        ...collectExportNames(
          modulePath,
          compiled,
          knownPaths,
        ),
      ].sort();

    for (
      const exportName of
        exportNames
    ) {
      const key =
        modulePath +
        "#" +
        exportName;

      if (projectExports[key]) {
        diagnostics.push({
          kind:
            "duplicate-export",
          modulePath,
          symbol:
            exportName,
          detail:
            "Duplicate export key: " +
            key +
            ".",
        });
        continue;
      }

      const resolution =
        resolveProjectExport(
          modulePath,
          exportName,
          compiled,
          knownPaths,
        );

      if (
        resolution.status !==
        "resolved"
      ) {
        pushResolutionDiagnostic(
          diagnostics,
          modulePath,
          exportName,
          resolution,
        );
        continue;
      }

      projectExports[key] = {
        kind: "ref",
        name: prefixed(
          resolution.target
            .modulePath,
          resolution.target
            .localName,
        ),
      };
    }
  }

  const uniqueDiagnostics =
    new Map<
      string,
      ScriptSafeConfigProjectDiagnostic
    >();

  for (
    const diagnostic of
      diagnostics
  ) {
    const key = [
      diagnostic.kind,
      diagnostic.modulePath,
      diagnostic.symbol ?? "",
      diagnostic.detail,
    ].join("|");
    uniqueDiagnostics.set(
      key,
      diagnostic,
    );
  }

  return {
    environment: {
      bindings,
      functions,
    },
    exports:
      projectExports,
    diagnostics:
      [
        ...uniqueDiagnostics.values(),
      ].sort(
        (a, b) =>
          a.modulePath.localeCompare(
            b.modulePath,
          ) ||
          (a.symbol ?? "")
            .localeCompare(
              b.symbol ?? "",
            ) ||
          a.kind.localeCompare(
            b.kind,
          ) ||
          a.detail.localeCompare(
            b.detail,
          ),
      ),
  };
}

export function evaluateScriptSafeConfigExport(
  project:
    ScriptSafeConfigProject,
  modulePath: string,
  exportName: string,
): SafeConfigValue {
  const key =
    normalizePath(modulePath) +
    "#" +
    exportName;
  const expression =
    project.exports[key];

  if (!expression) {
    throw new Error(
      "Unknown linked safe-config export: " +
        key,
    );
  }

  return evaluateSafeConfig(
    expression,
    project.environment,
  );
}
