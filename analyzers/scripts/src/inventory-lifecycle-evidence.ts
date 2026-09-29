import ts from "typescript";
import type {
  SourceRef,
} from "../../../packages/project-model/src/index.js";

export type ScriptInventoryEvidenceKind =
  | "inventory-clear"
  | "equipment-clear"
  | "item-grant"
  | "equipment-set"
  | "item-read"
  | "item-copy-mutation"
  | "item-writeback"
  | "item-drop";

export interface ScriptInventoryLifecycleEvidence {
  kind: ScriptInventoryEvidenceKind;
  executionRegion: string;
  subjectExpression: string;
  itemBinding?: string;
  slotExpression?: string;
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

function assignedIdentifier(
  call: ts.CallExpression,
): string | undefined {
  const parent = call.parent;
  if (
    ts.isVariableDeclaration(parent) &&
    ts.isIdentifier(parent.name)
  ) {
    return parent.name.text;
  }
  if (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind ===
      ts.SyntaxKind.EqualsToken &&
    ts.isIdentifier(parent.left)
  ) {
    return parent.left.text;
  }
  return undefined;
}

function rootIdentifier(
  expression: ts.Expression,
): string | undefined {
  let current = expression;
  while (
    ts.isPropertyAccessExpression(current) ||
    ts.isElementAccessExpression(current)
  ) {
    current = current.expression;
  }
  return ts.isIdentifier(current)
    ? current.text
    : undefined;
}

export function deriveScriptInventoryLifecycleEvidence(
  text: string,
  source: SourceRef,
): ScriptInventoryLifecycleEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );

  const copiedItems = new Map<
    string,
    {
      region: string;
      subjectExpression: string;
      slotExpression?: string;
    }
  >();
  const output: ScriptInventoryLifecycleEvidence[] = [];

  const push = (
    node: ts.Node,
    values: Omit<
      ScriptInventoryLifecycleEvidence,
      "executionRegion" | "source"
    >,
  ) => {
    output.push({
      ...values,
      executionRegion:
        executionRegion(node, file),
      source: nodeSource(file, node, source),
    });
  };

  const collectCopies = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(
        node.expression,
      ) &&
      node.expression.name.text === "getItem"
    ) {
      const binding = assignedIdentifier(node);
      if (binding) {
        const slot = node.arguments[0];
        copiedItems.set(binding, {
          region: executionRegion(node, file),
          subjectExpression:
            node.expression.expression.getText(file),
          ...(slot === undefined
            ? {}
            : {
                slotExpression:
                  slot.getText(file),
              }),
        });
        push(node, {
          kind: "item-read",
          subjectExpression:
            node.expression.expression.getText(file),
          itemBinding: binding,
          ...(slot === undefined
            ? {}
            : {
                slotExpression:
                  slot.getText(file),
              }),
        });
      }
    }
    ts.forEachChild(node, collectCopies);
  };

  collectCopies(file);

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(
        node.expression,
      )
    ) {
      const method = node.expression.name.text;
      const receiver =
        node.expression.expression.getText(file);

      if (method === "clearAll") {
        push(node, {
          kind: "inventory-clear",
          subjectExpression: receiver,
        });
      } else if (method === "addItem") {
        push(node, {
          kind: "item-grant",
          subjectExpression: receiver,
        });
      } else if (method === "setEquipment") {
        const item = node.arguments[1];
        push(node, {
          kind:
            item === undefined ||
            item.kind === ts.SyntaxKind.UndefinedKeyword
              ? "equipment-clear"
              : "equipment-set",
          subjectExpression: receiver,
          ...(item && ts.isIdentifier(item)
            ? { itemBinding: item.text }
            : {}),
        });
      } else if (method === "setItem") {
        const slot = node.arguments[0];
        const item = node.arguments[1];
        const copiedBinding =
          item && ts.isIdentifier(item) &&
          copiedItems.has(item.text)
            ? item.text
            : undefined;

        if (
          item === undefined ||
          item.kind === ts.SyntaxKind.UndefinedKeyword
        ) {
          push(node, {
            kind: "inventory-clear",
            subjectExpression: receiver,
            ...(slot === undefined
              ? {}
              : {
                  slotExpression:
                    slot.getText(file),
                }),
          });
        } else if (copiedBinding) {
          push(node, {
            kind: "item-writeback",
            subjectExpression: receiver,
            itemBinding: copiedBinding,
            ...(slot === undefined
              ? {}
              : {
                  slotExpression:
                    slot.getText(file),
                }),
          });
        }
      } else if (
        method === "spawnItem" ||
        method === "dropItem"
      ) {
        push(node, {
          kind: "item-drop",
          subjectExpression: receiver,
        });
      }

      const receiverRoot =
        rootIdentifier(node.expression.expression);
      if (
        receiverRoot &&
        copiedItems.has(receiverRoot) &&
        [
          "setLore",
          "setDynamicProperty",
          "setCanDestroy",
          "setCanPlaceOn",
        ].includes(method)
      ) {
        push(node, {
          kind: "item-copy-mutation",
          subjectExpression: receiver,
          itemBinding: receiverRoot,
        });
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind ===
        ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left)
    ) {
      const root = rootIdentifier(node.left);
      if (
        root &&
        copiedItems.has(root)
      ) {
        push(node, {
          kind: "item-copy-mutation",
          subjectExpression:
            node.left.getText(file),
          itemBinding: root,
        });
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
        candidate.itemBinding ===
          item.itemBinding &&
        candidate.slotExpression ===
          item.slotExpression &&
        candidate.source.range?.lineStart ===
          item.source.range?.lineStart
      ) === index
    )
    .sort((a, b) =>
      a.executionRegion.localeCompare(
        b.executionRegion,
      ) ||
      a.kind.localeCompare(b.kind) ||
      (a.itemBinding ?? "").localeCompare(
        b.itemBinding ?? "",
      )
    );
}

export function inventoryCopyMutationHasWriteback(
  evidence: readonly ScriptInventoryLifecycleEvidence[],
  itemBinding: string,
  executionRegion?: string,
): boolean {
  return evidence.some((item) =>
    item.kind === "item-writeback" &&
    item.itemBinding === itemBinding &&
    (
      executionRegion === undefined ||
      item.executionRegion ===
        executionRegion
    )
  );
}

