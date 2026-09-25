import ts from "typescript";
import type { SourceRef } from "../../../packages/project-model/src/index.js";
import {
  SCRIPT_METHOD_SYMBOL_RULES,
} from "../../../packages/compatibility/src/index.js";
import type {
  ScriptLifecycleMemberExposure,
  ScriptMethodCall,
} from "./types.js";

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
      columnStart: start.character + 1,
      columnEnd: end.character + 1,
    },
  };
}

function rangeKey(source: SourceRef): string {
  const range = source.range;
  return [
    source.relativePath,
    range?.lineStart ?? 0,
    range?.columnStart ?? 0,
    range?.lineEnd ?? 0,
    range?.columnEnd ?? 0,
  ].join(":");
}

function memberName(symbol: string): string {
  return symbol.slice(symbol.lastIndexOf(".") + 1);
}

export function inferScriptLifecycleMemberExposures(
  file: ts.SourceFile,
  source: SourceRef,
  methodCalls: readonly ScriptMethodCall[],
): ScriptLifecycleMemberExposure[] {
  const candidatesByMember = new Map<string, string[]>();

  for (const rule of SCRIPT_METHOD_SYMBOL_RULES) {
    if (!rule.lifecycle) continue;
    const member = memberName(rule.symbol);
    const current = candidatesByMember.get(member) ?? [];
    if (!current.includes(rule.symbol)) current.push(rule.symbol);
    candidatesByMember.set(member, current);
  }

  const exactByRange = new Map(
    methodCalls.map((call) => [rangeKey(call.source), call.symbol]),
  );

  const output: ScriptLifecycleMemberExposure[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const member = node.expression.name.text;
      const candidateSymbols = candidatesByMember.get(member);
      if (candidateSymbols) {
        const callSource = lineSource(file, node, source);
        const inferred = exactByRange.get(rangeKey(callSource));
        const exactSymbol =
          inferred && candidateSymbols.includes(inferred)
            ? inferred
            : undefined;

        output.push({
          member,
          candidateSymbols: [...candidateSymbols].sort(),
          evidence: exactSymbol ? "exact-symbol" : "lexical-only",
          ...(exactSymbol ? { exactSymbol } : {}),
          source: callSource,
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(file);
  return output;
}
