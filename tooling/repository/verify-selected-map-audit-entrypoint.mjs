import { readFileSync } from "node:fs";
import ts from "typescript";

const CLI_PATH = "apps/cli/src/main.ts";
const sourceText = readFileSync(CLI_PATH, "utf8");
const sourceFile = ts.createSourceFile(
  CLI_PATH,
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const productionCommands = new Set([
  "audit",
  "probe-plan",
  "probe-replay",
  "workflow",
  "arena-audit",
  "review",
  "inspect",
]);

function commandNamesFromExpression(expression) {
  const names = new Set();
  function visit(node) {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind ===
        ts.SyntaxKind.EqualsEqualsEqualsToken
    ) {
      const left = node.left;
      const right = node.right;
      if (
        ts.isIdentifier(left) &&
        left.text === "command" &&
        ts.isStringLiteralLike(right)
      ) {
        names.add(right.text);
      }
      if (
        ts.isIdentifier(right) &&
        right.text === "command" &&
        ts.isStringLiteralLike(left)
      ) {
        names.add(left.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(expression);
  return [...names];
}

function calledIdentifiers(statement) {
  const names = new Set();
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression)
    ) {
      names.add(node.expression.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(statement);
  return names;
}

const bodies = new Map();

function collect(node) {
  if (ts.isIfStatement(node)) {
    const commandNames =
      commandNamesFromExpression(node.expression)
        .filter((name) =>
          productionCommands.has(name)
        );
    if (commandNames.length > 0) {
      const calls =
        calledIdentifiers(node.thenStatement);
      for (const command of commandNames) {
        bodies.set(command, calls);
      }
    }
  }
  ts.forEachChild(node, collect);
}
collect(sourceFile);

const issues = [];
for (const command of productionCommands) {
  const calls = bodies.get(command);
  if (!calls) {
    issues.push(
      "Production selected-map command is missing: " +
        command,
    );
    continue;
  }
  if (!calls.has("runSelectedMapAudit")) {
    issues.push(
      command +
        " does not enter through runSelectedMapAudit().",
    );
  }
  if (calls.has("inspectArtifact")) {
    issues.push(
      command +
        " bypasses the canonical selected-map audit through inspectArtifact().",
    );
  }
}

const internalImport =
  '../../../engine/packages/orchestrator/src/inspection/inspect-artifact.js';
let internalPrimitiveExplicit = false;
for (const statement of sourceFile.statements) {
  if (
    ts.isImportDeclaration(statement) &&
    ts.isStringLiteral(statement.moduleSpecifier) &&
    statement.moduleSpecifier.text === internalImport
  ) {
    internalPrimitiveExplicit = true;
  }
}
if (!internalPrimitiveExplicit) {
  issues.push(
    "Engineering-only inspectArtifact import is not explicitly internal.",
  );
}

if (issues.length > 0) {
  console.error(
    [
      "Selected-map audit entrypoint verification failed:",
      ...issues.map((issue) => "- " + issue),
    ].join("\n"),
  );
  process.exitCode = 1;
} else {
  console.log(
    "Selected-map production commands use the canonical audit entrypoint.",
  );
}
