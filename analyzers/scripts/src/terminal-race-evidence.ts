import ts from "typescript";
import type {
  SourceRef,
} from "../../../packages/project-model/src/index.js";

export interface ScriptTerminalRaceEvidence {
  executionRegion: string;
  target: string;
  directCalls: number;
  deferredCalls: number;
  classification: "competing-terminal-paths";
  source: SourceRef;
}

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".ts")) return ts.ScriptKind.TS;
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function executionRegion(node: ts.Node, file: ts.SourceFile): ts.Node {
  let current: ts.Node | undefined = node;
  while (current) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isArrowFunction(current) ||
      ts.isFunctionExpression(current)
    ) return current;
    current = current.parent;
  }
  return file;
}

function regionId(node: ts.Node, file: ts.SourceFile): string {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return "function:" + node.name.text;
  }
  if (ts.isMethodDeclaration(node)) {
    const name = node.name;
    if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) {
      return "function:" + name.text;
    }
  }
  if (node === file) return "module";
  const start = file.getLineAndCharacterOfPosition(node.getStart(file));
  return "callback@" + (start.line + 1) + ":" + (start.character + 1);
}

function sourceRef(file: ts.SourceFile, node: ts.Node, source: SourceRef): SourceRef {
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

function callTarget(call: ts.CallExpression): string | undefined {
  if (ts.isIdentifier(call.expression)) return call.expression.text;
  if (ts.isPropertyAccessExpression(call.expression)) {
    return call.expression.name.text;
  }
  return undefined;
}

function terminalLike(name: string): boolean {
  return /(?:finish|finalize|end|complete|victory|defeat|cleanup|reset)/i.test(name);
}

function isDeferredScheduler(call: ts.CallExpression): boolean {
  return (
    ts.isPropertyAccessExpression(call.expression) &&
    /^(?:runTimeout|runInterval|runJob)$/.test(call.expression.name.text)
  );
}

export function deriveTerminalRaceEvidence(
  text: string,
  source: SourceRef,
): ScriptTerminalRaceEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );

  const regions = new Map<
    string,
    {
      direct: Map<string, number>;
      deferred: Map<string, number>;
      node: ts.Node;
    }
  >();

  const ensure = (node: ts.Node) => {
    const id = regionId(node, file);
    const current = regions.get(id);
    if (current) return current;
    const created = {
      direct: new Map<string, number>(),
      deferred: new Map<string, number>(),
      node,
    };
    regions.set(id, created);
    return created;
  };

  const visit = (node: ts.Node, deferred = false): void => {
    if (ts.isCallExpression(node)) {
      const regionNode = executionRegion(node, file);
      const bucket = ensure(regionNode);

      if (isDeferredScheduler(node)) {
        const callback = node.arguments[0];
        if (
          callback &&
          (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
        ) {
          const nested = (child: ts.Node): void => {
            if (ts.isCallExpression(child)) {
              const target = callTarget(child);
              if (target && terminalLike(target)) {
                bucket.deferred.set(
                  target,
                  (bucket.deferred.get(target) ?? 0) + 1,
                );
              }
            }
            ts.forEachChild(child, nested);
          };
          nested(callback.body);
        }
      } else if (!deferred) {
        const target = callTarget(node);
        if (target && terminalLike(target)) {
          bucket.direct.set(
            target,
            (bucket.direct.get(target) ?? 0) + 1,
          );
        }
      }
    }

    ts.forEachChild(node, (child) => visit(child, deferred));
  };

  visit(file);

  const output: ScriptTerminalRaceEvidence[] = [];
  for (const [id, bucket] of regions) {
    for (const [target, deferredCalls] of bucket.deferred) {
      const directCalls = bucket.direct.get(target) ?? 0;
      if (directCalls === 0) continue;
      output.push({
        executionRegion: id,
        target,
        directCalls,
        deferredCalls,
        classification: "competing-terminal-paths",
        source: sourceRef(file, bucket.node, source),
      });
    }
  }
  return output.sort((a, b) =>
    a.executionRegion.localeCompare(b.executionRegion) ||
    a.target.localeCompare(b.target)
  );
}
