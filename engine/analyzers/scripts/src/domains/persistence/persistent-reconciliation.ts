import ts from "typescript";
import type { SourceRef } from "../../../../../packages/project-model/src/index.js";

export interface PersistentReconciliationEvidence {
  worldLoadSubscribed: boolean;
  rootPersistentReads: string[];
  reconciliationRegions: string[];
  journalKeys: string[];
  absenceBranches: string[];
  status: "reconciled" | "partial" | "unresolved";
  source: SourceRef;
}

function scriptKind(path: string): ts.ScriptKind {
  return path.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS;
}

function literalPropertyKey(call: ts.CallExpression): string | undefined {
  const arg = call.arguments[0];
  return arg && ts.isStringLiteralLike(arg) ? arg.text : undefined;
}

function region(node: ts.Node): string {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) {
      return "function:" + current.name.text;
    }
    if (ts.isMethodDeclaration(current) && ts.isIdentifier(current.name)) {
      return "function:" + current.name.text;
    }
    current = current.parent;
  }
  return "module";
}

export function derivePersistentReconciliationEvidence(
  text: string,
  source: SourceRef,
): PersistentReconciliationEvidence {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );
  let worldLoadSubscribed = false;
  const rootPersistentReads = new Set<string>();
  const reconciliationRegions = new Set<string>();
  const journalKeys = new Set<string>();
  const absenceBranches = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const method = node.expression.name.text;
      const expressionText = node.expression.expression.getText(file);
      if (
        method === "subscribe" &&
        /(?:world|system)\.afterEvents\.worldLoad$/.test(expressionText)
      ) {
        worldLoadSubscribed = true;
      }

      if (method === "getDynamicProperty") {
        const key = literalPropertyKey(node);
        if (key) {
          if (region(node) === "module") rootPersistentReads.add(key);
          if (/(?:journal|watchdog|recovery|transaction|operation)/i.test(key)) {
            journalKeys.add(key);
          }
          const r = region(node);
          if (/(?:reconcile|recover|restore|worldLoad|startup|initialize)/i.test(r)) {
            reconciliationRegions.add(r);
          }
        }
      }
    }

    if (ts.isIfStatement(node)) {
      const condition = node.expression.getText(file);
      if (
        /getDynamicProperty/.test(condition) &&
        /(?:===?\s*(?:undefined|null)|!\s*\w|\?\?)/.test(condition)
      ) {
        absenceBranches.add(condition);
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(file);

  const status =
    worldLoadSubscribed && reconciliationRegions.size > 0
      ? "reconciled"
      : worldLoadSubscribed || reconciliationRegions.size > 0
        ? "partial"
        : "unresolved";

  return {
    worldLoadSubscribed,
    rootPersistentReads: [...rootPersistentReads].sort(),
    reconciliationRegions: [...reconciliationRegions].sort(),
    journalKeys: [...journalKeys].sort(),
    absenceBranches: [...absenceBranches].sort(),
    status,
    source,
  };
}
