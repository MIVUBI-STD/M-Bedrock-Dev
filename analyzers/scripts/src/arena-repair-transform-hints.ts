import ts from "typescript";
import type {
  RepairSourceTransformHint,
  SourceRef,
} from "../../../packages/project-model/src/index.js";
import {
  validateRepairSourceTransformHint,
} from "../../../packages/project-model/src/index.js";
import {
  SCRIPT_REPAIR_HINT_ANALYZER_ID,
  SCRIPT_REPAIR_HINT_ANALYZER_REVISION,
  SCRIPT_REPAIR_HINT_PARSER_ID,
  SCRIPT_REPAIR_HINT_PARSER_REVISION,
} from "./repair-transform-hints.js";

const MEMBERSHIP_PROPERTY =
  /^(?:members|players|participants|memberships)$/i;
const CAPACITY_PROPERTY =
  /^(?:maxPlayers|maxParticipants|capacity)$/i;

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".ts")) return ts.ScriptKind.TS;
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function lineSource(
  file: ts.SourceFile,
  node: ts.Node,
  source: SourceRef,
): SourceRef {
  const start = file.getLineAndCharacterOfPosition(
    node.getStart(file),
  );
  const end = file.getLineAndCharacterOfPosition(
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

function functionBody(
  node: ts.Node,
): ts.Block | undefined {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isMethodDeclaration(node)
  ) {
    return node.body;
  }
  if (
    ts.isArrowFunction(node) &&
    ts.isBlock(node.body)
  ) {
    return node.body;
  }
  return undefined;
}

function functionOwner(
  node: ts.Node,
  file: ts.SourceFile,
): string {
  if (
    ts.isFunctionDeclaration(node) &&
    node.name
  ) {
    return "function:" + node.name.text;
  }
  if (
    ts.isMethodDeclaration(node) &&
    node.name &&
    (
      ts.isIdentifier(node.name) ||
      ts.isStringLiteralLike(node.name)
    )
  ) {
    return "method:" + node.name.text;
  }
  const start =
    file.getLineAndCharacterOfPosition(
      node.getStart(file),
    );
  return (
    "callback@" +
    (start.line + 1) +
    ":" +
    (start.character + 1)
  );
}

function capacityDeclaration(
  statement: ts.Statement,
  file: ts.SourceFile,
):
  | {
      arenaExpression: string;
      capacityIdentifier: string;
    }
  | undefined {
  if (!ts.isVariableStatement(statement)) {
    return undefined;
  }
  if (
    (statement.declarationList.flags &
      ts.NodeFlags.Const) === 0 ||
    statement.declarationList.declarations.length !== 1
  ) {
    return undefined;
  }

  const declaration =
    statement.declarationList.declarations[0]!;
  if (
    !ts.isIdentifier(declaration.name) ||
    !declaration.initializer ||
    !ts.isPropertyAccessExpression(
      declaration.initializer,
    ) ||
    !CAPACITY_PROPERTY.test(
      declaration.initializer.name.text,
    )
  ) {
    return undefined;
  }

  return {
    arenaExpression:
      declaration.initializer.expression.getText(
        file,
      ),
    capacityIdentifier:
      declaration.name.text,
  };
}

function membershipCommit(
  statement: ts.Statement,
  file: ts.SourceFile,
):
  | {
      arenaExpression: string;
      membershipExpression: string;
      countExpression: string;
      expectedText: string;
    }
  | undefined {
  if (!ts.isExpressionStatement(statement)) {
    return undefined;
  }
  const call = statement.expression;
  if (
    !ts.isCallExpression(call) ||
    !ts.isPropertyAccessExpression(call.expression)
  ) {
    return undefined;
  }

  const method = call.expression.name.text;
  if (
    method !== "add" &&
    method !== "push" &&
    method !== "set"
  ) {
    return undefined;
  }

  const receiver = call.expression.expression;
  if (
    !ts.isPropertyAccessExpression(receiver) ||
    !MEMBERSHIP_PROPERTY.test(
      receiver.name.text,
    )
  ) {
    return undefined;
  }

  const arenaExpression =
    receiver.expression.getText(file);
  const membershipExpression =
    receiver.getText(file);
  const countExpression =
    membershipExpression +
    (method === "push" ? ".length" : ".size");

  return {
    arenaExpression,
    membershipExpression,
    countExpression,
    expectedText: statement.getText(file),
  };
}

export function deriveArenaCapacityGuardTransformHints(
  identifier: string,
  text: string,
  source: SourceRef,
): RepairSourceTransformHint[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );
  const output: RepairSourceTransformHint[] = [];

  const visit = (node: ts.Node): void => {
    const body = functionBody(node);
    if (body && body.statements.length === 2) {
      const capacity = capacityDeclaration(
        body.statements[0]!,
        file,
      );
      const commit = membershipCommit(
        body.statements[1]!,
        file,
      );

      if (
        capacity &&
        commit &&
        capacity.arenaExpression ===
          commit.arenaExpression
      ) {
        const commitSource = lineSource(
          file,
          body.statements[1]!,
          source,
        );
        if (
          commitSource.range?.lineStart !==
            undefined &&
          commitSource.range.lineEnd !==
            undefined &&
          commitSource.range.lineStart ===
            commitSource.range.lineEnd
        ) {
          const hint: RepairSourceTransformHint = {
            schemaVersion: 1,
            id: [
              "repair-hint",
              "arena-capacity-guard",
              encodeURIComponent(identifier),
              encodeURIComponent(
                source.relativePath,
              ),
              commitSource.range.lineStart,
              commitSource.range.columnStart ?? 0,
            ].join(":"),
            family: "arena-ownership-guard",
            analyzerId:
              SCRIPT_REPAIR_HINT_ANALYZER_ID,
            analyzerRevision:
              SCRIPT_REPAIR_HINT_ANALYZER_REVISION,
            parserId:
              SCRIPT_REPAIR_HINT_PARSER_ID,
            parserRevision:
              SCRIPT_REPAIR_HINT_PARSER_REVISION,
            semanticOwnerId:
              "script:" +
              identifier +
              ":" +
              functionOwner(node, file),
            source: commitSource,
            expectedText:
              commit.expectedText,
            replacementText:
              "if (" +
              commit.countExpression +
              " < " +
              capacity.capacityIdentifier +
              ") " +
              commit.expectedText,
            supportedPredicateIds: [
              "arena-capacity-overflow-observed",
            ],
            supportedFactorIds: [
              "capacity-guard-enabled",
            ],
            validationKinds: [
              "reparse",
              "rebuild-graph",
            ],
          };

          if (
            validateRepairSourceTransformHint(
              hint,
            ).length === 0
          ) {
            output.push(hint);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(file);

  return output.sort((a, b) =>
    a.id.localeCompare(b.id)
  );
}
