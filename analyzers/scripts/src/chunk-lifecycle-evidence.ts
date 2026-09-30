import ts from "typescript";
import type {
  SourceRef,
} from "../../../packages/project-model/src/index.js";

export type ScriptChunkLifecycleEvidenceKind =
  | "world-load-subscription"
  | "entity-load-subscription"
  | "entity-remove-subscription"
  | "shutdown-subscription"
  | "chunk-readiness-probe"
  | "ticking-area-acquire"
  | "ticking-area-release"
  | "ticking-area-capacity-check";

export interface ScriptChunkLifecycleEvidence {
  kind: ScriptChunkLifecycleEvidenceKind;
  executionRegion: string;
  receiverExpression: string;
  leaseKey?: string;
  source: SourceRef;
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
  const start =
    file.getLineAndCharacterOfPosition(
      node.getStart(file),
    );
  const end =
    file.getLineAndCharacterOfPosition(
      node.getEnd(),
    );
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

function executionRegion(
  node: ts.Node,
  file: ts.SourceFile,
): string {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      ts.isFunctionDeclaration(current) &&
      current.name
    ) {
      return "function:" + current.name.text;
    }
    if (ts.isMethodDeclaration(current)) {
      const name = current.name;
      if (
        ts.isIdentifier(name) ||
        ts.isStringLiteralLike(name)
      ) {
        return "function:" + name.text;
      }
    }
    if (
      ts.isArrowFunction(current) ||
      ts.isFunctionExpression(current)
    ) {
      const start =
        file.getLineAndCharacterOfPosition(
          current.getStart(file),
        );
      return (
        "callback@" +
        (start.line + 1) +
        ":" +
        (start.character + 1)
      );
    }
    current = current.parent;
  }
  return "module";
}

function callbackRegion(
  call: ts.CallExpression,
  file: ts.SourceFile,
): string | undefined {
  const callback = call.arguments[0];
  if (
    !callback ||
    (
      !ts.isArrowFunction(callback) &&
      !ts.isFunctionExpression(callback)
    )
  ) {
    return undefined;
  }
  const start =
    file.getLineAndCharacterOfPosition(
      callback.getStart(file),
    );
  return (
    "callback@" +
    (start.line + 1) +
    ":" +
    (start.character + 1)
  );
}

function literalString(
  expression: ts.Expression | undefined,
): string | undefined {
  return (
    expression &&
    (
      ts.isStringLiteralLike(expression) ||
      ts.isNoSubstitutionTemplateLiteral(
        expression,
      )
    )
  )
    ? expression.text
    : undefined;
}

function eventName(
  call: ts.CallExpression,
): string | undefined {
  if (
    !ts.isPropertyAccessExpression(
      call.expression,
    ) ||
    call.expression.name.text !== "subscribe"
  ) {
    return undefined;
  }
  const owner = call.expression.expression;
  return ts.isPropertyAccessExpression(owner)
    ? owner.name.text
    : undefined;
}

export function deriveScriptChunkLifecycleEvidence(
  text: string,
  source: SourceRef,
): ScriptChunkLifecycleEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );
  const output: ScriptChunkLifecycleEvidence[] = [];
  const tickingAreaReceivers =
    new Set<string>();

  const collectTickingAreaReceivers = (
    node: ts.Node,
  ): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(
        node.expression,
      ) &&
      (
        node.expression.name.text ===
          "createTickingArea" ||
        node.expression.name.text ===
          "removeTickingArea"
      )
    ) {
      tickingAreaReceivers.add(
        node.expression.expression.getText(
          file,
        ),
      );
    }
    ts.forEachChild(
      node,
      collectTickingAreaReceivers,
    );
  };

  collectTickingAreaReceivers(file);

  const push = (
    node: ts.Node,
    kind: ScriptChunkLifecycleEvidenceKind,
    receiverExpression: string,
    options: {
      executionRegion?: string;
      leaseKey?: string;
    } = {},
  ) => {
    output.push({
      kind,
      executionRegion:
        options.executionRegion ??
        executionRegion(node, file),
      receiverExpression,
      ...(options.leaseKey === undefined
        ? {}
        : { leaseKey: options.leaseKey }),
      source: nodeSource(file, node, source),
    });
  };

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(
        node.expression,
      )
    ) {
      const method =
        node.expression.name.text;
      const receiver =
        node.expression.expression.getText(file);
      const event = eventName(node);

      const region =
        callbackRegion(node, file);

      if (event === "worldLoad") {
        push(
          node,
          "world-load-subscription",
          receiver,
          {
            ...(region === undefined
              ? {}
              : { executionRegion: region }),
          },
        );
      } else if (event === "entityLoad") {
        push(
          node,
          "entity-load-subscription",
          receiver,
          {
            ...(region === undefined
              ? {}
              : { executionRegion: region }),
          },
        );
      } else if (event === "entityRemove") {
        push(
          node,
          "entity-remove-subscription",
          receiver,
          {
            ...(region === undefined
              ? {}
              : { executionRegion: region }),
          },
        );
      } else if (event === "shutdown") {
        push(
          node,
          "shutdown-subscription",
          receiver,
          {
            ...(region === undefined
              ? {}
              : { executionRegion: region }),
          },
        );
      }

      if (method === "isChunkLoaded") {
        push(
          node,
          "chunk-readiness-probe",
          receiver,
        );
      }

      if (
        method === "createTickingArea"
      ) {
        push(
          node,
          "ticking-area-acquire",
          receiver,
          {
            leaseKey:
              literalString(
                node.arguments[0],
              ),
          },
        );
      }

      if (
        method === "removeTickingArea"
      ) {
        push(
          node,
          "ticking-area-release",
          receiver,
          {
            leaseKey:
              literalString(
                node.arguments[0],
              ),
          },
        );
      }

      if (
        method === "hasCapacity" &&
        (
          /tickingArea/i.test(receiver) ||
          tickingAreaReceivers.has(receiver)
        )
      ) {
        push(
          node,
          "ticking-area-capacity-check",
          receiver,
        );
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(file);

  return output
    .filter((item, index, array) =>
      array.findIndex((candidate) =>
        candidate.kind === item.kind &&
        candidate.executionRegion ===
          item.executionRegion &&
        candidate.receiverExpression ===
          item.receiverExpression &&
        candidate.leaseKey ===
          item.leaseKey &&
        candidate.source.range?.lineStart ===
          item.source.range?.lineStart
      ) === index
    )
    .sort((a, b) =>
      a.executionRegion.localeCompare(
        b.executionRegion,
      ) ||
      a.kind.localeCompare(b.kind) ||
      (a.leaseKey ?? "").localeCompare(
        b.leaseKey ?? "",
      )
    );
}
