import ts from "typescript";
import type {
  SourceRef,
} from "../../../packages/project-model/src/index.js";

export type ScriptCombatEvidenceKind =
  | "hurt-subscription"
  | "death-subscription"
  | "damage-apply"
  | "knockback"
  | "effect-apply"
  | "ignite"
  | "projectile-spawn"
  | "projectile-remove";

export interface ScriptCombatLifecycleEvidence {
  kind: ScriptCombatEvidenceKind;
  executionRegion: string;
  subjectExpression: string;
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

function eventNameFromSubscription(
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
  if (!ts.isPropertyAccessExpression(owner)) {
    return undefined;
  }
  return owner.name.text;
}

export function deriveScriptCombatLifecycleEvidence(
  text: string,
  source: SourceRef,
): ScriptCombatLifecycleEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );
  const output: ScriptCombatLifecycleEvidence[] = [];

  const push = (
    node: ts.Node,
    kind: ScriptCombatEvidenceKind,
    subjectExpression: string,
  ) => {
    output.push({
      kind,
      executionRegion:
        executionRegion(node, file),
      subjectExpression,
      source: nodeSource(file, node, source),
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const event =
        eventNameFromSubscription(node);
      if (event === "entityHurt") {
        push(
          node,
          "hurt-subscription",
          node.expression.getText(file),
        );
      } else if (event === "entityDie") {
        push(
          node,
          "death-subscription",
          node.expression.getText(file),
        );
      }

      if (
        ts.isPropertyAccessExpression(
          node.expression,
        )
      ) {
        const method =
          node.expression.name.text;
        const receiver =
          node.expression.expression.getText(file);

        if (method === "applyDamage") {
          push(
            node,
            "damage-apply",
            receiver,
          );
        } else if (
          method === "applyKnockback" ||
          method === "applyImpulse"
        ) {
          push(node, "knockback", receiver);
        } else if (method === "addEffect") {
          push(node, "effect-apply", receiver);
        } else if (method === "setOnFire") {
          push(node, "ignite", receiver);
        } else if (method === "spawnProjectile") {
          push(
            node,
            "projectile-spawn",
            receiver,
          );
        } else if (
          method === "remove" ||
          method === "kill"
        ) {
          push(
            node,
            "projectile-remove",
            receiver,
          );
        }
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
        candidate.subjectExpression ===
          item.subjectExpression &&
        candidate.source.range?.lineStart ===
          item.source.range?.lineStart
      ) === index
    )
    .sort((a, b) =>
      a.executionRegion.localeCompare(
        b.executionRegion,
      ) ||
      a.kind.localeCompare(b.kind)
    );
}
