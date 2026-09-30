import ts from "typescript";
import type {
  LifecycleProofTransition,
} from "../../../packages/behavior-model/src/lifecycle-proof.js";
import type {
  SourceRef,
} from "../../../packages/project-model/src/index.js";

export interface ScriptLifecycleGraphTransition
  extends LifecycleProofTransition {
  source: SourceRef;
  confidence: "explicit" | "bounded-inference";
}

export interface ScriptLifecycleGraph {
  transitions: readonly ScriptLifecycleGraphTransition[];
  states: readonly string[];
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

function stateAssignment(
  node: ts.Node,
): {
  target: string;
  state: string;
} | undefined {
  if (
    !ts.isBinaryExpression(node) ||
    node.operatorToken.kind !==
      ts.SyntaxKind.EqualsToken ||
    !ts.isStringLiteralLike(node.right)
  ) {
    return undefined;
  }

  const left = node.left;
  if (
    !ts.isIdentifier(left) &&
    !ts.isPropertyAccessExpression(left)
  ) {
    return undefined;
  }

  const target =
    ts.isIdentifier(left)
      ? left.text
      : left.getText();
  if (!/(?:state|phase|status)$/i.test(target)) {
    return undefined;
  }
  return {
    target,
    state: node.right.text,
  };
}

function triggerFromName(
  name: string,
): string | undefined {
  if (/disconnect|leave/i.test(name)) return "disconnect";
  if (/victory|win|complete|finish/i.test(name)) return "victory";
  if (/defeat|lose|death|fail/i.test(name)) return "defeat";
  if (/abort|cancel/i.test(name)) return "abort";
  if (/reset/i.test(name)) return "reset";
  return undefined;
}

export function deriveScriptTerminalLifecycleGraph(
  text: string,
  source: SourceRef,
): ScriptLifecycleGraph {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );

  const transitions: ScriptLifecycleGraphTransition[] = [];
  const states = new Set<string>();

  const functions = file.statements.filter(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) &&
      statement.name !== undefined &&
      statement.body !== undefined,
  );

  for (const fn of functions) {
    const assignments: Array<{
      state: string;
      node: ts.Node;
    }> = [];
    const visit = (node: ts.Node): void => {
      const assignment = stateAssignment(node);
      if (assignment) {
        assignments.push({
          state: assignment.state,
          node,
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(fn.body!);

    for (
      let index = 1;
      index < assignments.length;
      index += 1
    ) {
      const previous = assignments[index - 1]!;
      const current = assignments[index]!;
      states.add(previous.state);
      states.add(current.state);
      transitions.push({
        id:
          source.relativePath +
          ":" +
          fn.name!.text +
          ":" +
          index,
        from: previous.state,
        to: current.state,
        ...(triggerFromName(fn.name!.text)
          ? { trigger: triggerFromName(fn.name!.text)! }
          : {}),
        source: nodeSource(
          file,
          current.node,
          source,
        ),
        confidence: "bounded-inference",
      });
    }

    if (
      assignments.length === 1
    ) {
      const only = assignments[0]!;
      const trigger =
        triggerFromName(fn.name!.text);
      if (trigger) {
        states.add("*");
        states.add(only.state);
        transitions.push({
          id:
            source.relativePath +
            ":" +
            fn.name!.text +
            ":terminal",
          from: "*",
          to: only.state,
          trigger,
          source: nodeSource(
            file,
            only.node,
            source,
          ),
          confidence: "bounded-inference",
        });
      }
    }
  }

  return {
    transitions,
    states: [...states].sort(),
  };
}
