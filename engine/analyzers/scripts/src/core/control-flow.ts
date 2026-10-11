import ts from "typescript";
import type { SourceRef, SourceSequentialSite } from "../../../../packages/project-model/src/index.js";
import type { ScriptControlFlowRegion, ScriptControlFlowNode, ScriptControlFlowEdge } from "./types.js";

/**
 * Source-local basic-statement CFG over the SAME AST used by parseScriptFile.
 * Supported: sequential blocks, if/else blocks, return and throw.
 * Unsupported control and effects become explicit opaque barriers, never
 * speculative edges with falsely proven semantics.
 */
export function deriveScriptControlFlow(
  file: ts.SourceFile,
  source: SourceRef,
): readonly ScriptControlFlowRegion[] {
  const at = (node: ts.Node): SourceRef => {
    const a = file.getLineAndCharacterOfPosition(node.getStart(file));
    const b = file.getLineAndCharacterOfPosition(node.getEnd());
    return { ...source, range: {
      lineStart: a.line + 1, columnStart: a.character + 1,
      lineEnd: b.line + 1, columnEnd: b.character + 1,
    } };
  };
  const worldNames = new Set<string>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text !== "@minecraft/server") continue;
    const named = statement.importClause?.namedBindings;
    if (!named || !ts.isNamedImports(named)) continue;
    for (const element of named.elements) {
      if ((element.propertyName?.text ?? element.name.text) === "world") {
        worldNames.add(element.name.text);
      }
    }
  }
  const safeCall = (call: ts.CallExpression): boolean => {
    if (!ts.isPropertyAccessExpression(call.expression) ||
        !ts.isIdentifier(call.expression.expression) ||
        !worldNames.has(call.expression.expression.text) ||
        !["getDynamicProperty", "setDynamicProperty"].includes(call.expression.name.text)) {
      return false;
    }
    return call.arguments.length >= 1 &&
      ts.isStringLiteralLike(call.arguments[0]!) &&
      call.arguments.every(arg => !hasOpaqueEffect(arg));
  };
  function hasOpaqueEffect(node: ts.Node): boolean {
    if (ts.isFunctionLike(node)) return false;
    if (ts.isCallExpression(node)) {
      return !safeCall(node);
    }
    if (ts.isAwaitExpression(node) || ts.isYieldExpression(node) ||
        ts.isDeleteExpression(node) || ts.isPostfixUnaryExpression(node) ||
        ts.isPrefixUnaryExpression(node) && [
          ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken,
        ].includes(node.operator)) return true;
    if (ts.isBinaryExpression(node) && [
      ts.SyntaxKind.EqualsToken,
      ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken,
      ts.SyntaxKind.AsteriskEqualsToken, ts.SyntaxKind.SlashEqualsToken,
      ts.SyntaxKind.BarBarEqualsToken, ts.SyntaxKind.AmpersandAmpersandEqualsToken,
      ts.SyntaxKind.QuestionQuestionEqualsToken,
    ].includes(node.operatorToken.kind)) return true;
    return ts.forEachChild(node, child => hasOpaqueEffect(child) ? true : undefined) === true;
  }
  const regions: ScriptControlFlowRegion[] = [];
  const regionNames = new Set<string>();
  const duplicates = new Set<string>();
  const addRegion = (region: string, body: ts.Block | ts.SourceFile): void => {
    if (regionNames.has(region)) {
      duplicates.add(region);
      return;
    }
    regionNames.add(region);
    const nodes: ScriptControlFlowNode[] = [];
    const edges: ScriptControlFlowEdge[] = [];
    const entry = region + ":entry";
    const exit = region + ":exit";
    nodes.push({ id: entry, kind: "entry" }, { id: exit, kind: "exit" });
    const addEdge = (from: string, to: string, branch?: "true" | "false") => {
      edges.push({ from, to, ...(branch ? { branch } : {}) });
    };
    const addNode = (
      stmt: ts.Statement,
      kind: ScriptControlFlowNode["kind"],
      block: ts.Block | ts.SourceFile,
      ordinal: number,
    ): string => {
      const id = region + ":stmt:" + String(stmt.getStart(file));
      const site: SourceSequentialSite = {
        block: at(block),
        statementIndex: ordinal,
        directCall: ts.isExpressionStatement(stmt) &&
          ts.isCallExpression(stmt.expression),
      };
      nodes.push({ id, kind, site });
      return id;
    };
    const simpleBranch = (stmt: ts.Statement): boolean =>
      ts.isBlock(stmt) || ts.isReturnStatement(stmt) ||
      ts.isThrowStatement(stmt);
    const buildSeq = (
      statements: readonly ts.Statement[],
      block: ts.Block | ts.SourceFile,
      following: string,
    ): string => {
      let next = following;
      for (let i = statements.length - 1; i >= 0; i -= 1) {
        const stmt = statements[i]!;
        if (ts.isBlock(stmt)) {
          next = buildSeq(stmt.statements, stmt, next);
          continue;
        }
        if (ts.isIfStatement(stmt) && simpleBranch(stmt.thenStatement) &&
            (!stmt.elseStatement || simpleBranch(stmt.elseStatement)) &&
            !hasOpaqueEffect(stmt.expression)) {
          const id = addNode(stmt, "condition", block, i);
          const buildArm = (arm: ts.Statement | undefined) => {
            if (!arm) return next;
            if (ts.isBlock(arm)) return buildSeq(arm.statements, arm, next);
            const armNode = addNode(arm, "statement", block, i);
            addEdge(armNode, exit);
            return armNode;
          };
          addEdge(id, buildArm(stmt.thenStatement), "true");
          addEdge(id, buildArm(stmt.elseStatement), "false");
          next = id;
          continue;
        }
        const terminal = ts.isReturnStatement(stmt) || ts.isThrowStatement(stmt);
        const safeStatement =
          ts.isExpressionStatement(stmt) && !hasOpaqueEffect(stmt.expression) ||
          ts.isEmptyStatement(stmt) || ts.isFunctionDeclaration(stmt) ||
          ts.isImportDeclaration(stmt) || ts.isExportDeclaration(stmt);
        const kind: ScriptControlFlowNode["kind"] =
          terminal ? "statement" : safeStatement ? "statement" : "opaque";
        const id = addNode(stmt, kind, block, i);
        addEdge(id, terminal ? exit : next);
        next = id;
      }
      return next;
    };
    addEdge(entry, buildSeq(body.statements, body, exit));
    regions.push({ region, entryId: entry, nodes, edges });
  };
  addRegion("module", file);
  const walk = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.body) {
      addRegion(node.name ? "function:" + node.name.text : "anonymous-function", node.body);
    } else if (ts.isMethodDeclaration(node) && node.body && node.name &&
               ts.isIdentifier(node.name)) {
      addRegion("function:" + node.name.text, node.body);
    } else if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
               ts.isBlock(node.body)) {
      const start = file.getLineAndCharacterOfPosition(node.getStart(file));
      addRegion("callback@" + (start.line + 1) + ":" + (start.character + 1), node.body);
    }
    ts.forEachChild(node, walk);
  };
  ts.forEachChild(file, walk);
  return regions.filter(region => !duplicates.has(region.region));
}
