import {
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const CLI_PATH = "apps/cli/src/main.ts";
const PRODUCTION_COMMAND = "audit";
const ENGINEERING_COMMANDS = new Set([
  "dev-inspect",
  "dev-review",
  "dev-workflow",
  "dev-arena-audit",
  "dev-probe-plan",
  "dev-probe-replay",
]);

function filesUnder(root) {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return filesUnder(path);
    return /\.(?:ts|js|mjs|svelte)$/.test(path)
      ? [path.replaceAll("\\", "/")]
      : [];
  });
}

function parse(path) {
  return ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".ts")
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS,
  );
}

function commandNamesFromExpression(expression) {
  const names = new Set();
  function visit(node) {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind ===
        ts.SyntaxKind.EqualsEqualsEqualsToken
    ) {
      const pairs = [
        [node.left, node.right],
        [node.right, node.left],
      ];
      for (const [left, right] of pairs) {
        if (
          ts.isIdentifier(left) &&
          left.text === "command" &&
          ts.isStringLiteralLike(right)
        ) {
          names.add(right.text);
        }
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

const issues = [];
const cli = parse(CLI_PATH);
const commandBodies = new Map();

function collectCommands(node) {
  if (ts.isIfStatement(node)) {
    const commands =
      commandNamesFromExpression(node.expression);
    if (commands.length > 0) {
      const calls = calledIdentifiers(node.thenStatement);
      for (const command of commands) {
        commandBodies.set(command, calls);
      }
    }
  }
  ts.forEachChild(node, collectCommands);
}
collectCommands(cli);

const productionCalls =
  commandBodies.get(PRODUCTION_COMMAND);
if (!productionCalls) {
  issues.push(
    "Sole production command 'audit' is missing.",
  );
} else {
  if (!productionCalls.has("runSelectedMapAudit")) {
    issues.push(
      "Production command 'audit' does not enter through runSelectedMapAudit().",
    );
  }
  if (productionCalls.has("inspectArtifact")) {
    issues.push(
      "Production command 'audit' bypasses the canonical pipeline through inspectArtifact().",
    );
  }
}

for (const command of ENGINEERING_COMMANDS) {
  if (!commandBodies.has(command)) {
    issues.push(
      "Expected engineering-only command is missing: " +
        command,
    );
  }
}

const cliText = readFileSync(CLI_PATH, "utf8");
if (
  !cliText.includes(
    'process.env.MBEDROCK_ENGINEERING_TOOLS !== "1"',
  )
) {
  issues.push(
    "Engineering-only audit projections are not guarded by MBEDROCK_ENGINEERING_TOOLS.",
  );
}
if (
  !cliText.includes(
    'const productionAuditCommands = new Set([\n    "audit",\n  ]);',
  )
) {
  issues.push(
    "CLI production command set must contain only 'audit'.",
  );
}

const forbiddenAppImportFragments = [
  "/orchestrator/src/inspection/",
  "/orchestrator/src/reporting/",
];
const explicitEngineeringAllowlist =
  new Set([CLI_PATH]);

for (const path of filesUnder("apps")) {
  const source = parse(path);
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    if (
      forbiddenAppImportFragments.some((fragment) =>
        specifier.includes(fragment)
      ) &&
      !explicitEngineeringAllowlist.has(path)
    ) {
      issues.push(
        path +
          " imports internal audit plumbing directly: " +
          specifier,
      );
    }
  }
}

if (issues.length > 0) {
  console.error(
    [
      "Selected-map single-flow verification failed:",
      ...issues.map((issue) => "- " + issue),
    ].join("\n"),
  );
  process.exitCode = 1;
} else {
  console.log(
    "Selected-map production audit has one operator entry and no app-level internal bypass.",
  );
}
