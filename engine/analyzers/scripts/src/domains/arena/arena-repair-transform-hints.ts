import ts from "typescript";
import type {
  RepairSourceTransformHint,
  SourceRef,
} from "../../../../../packages/project-model/src/index.js";
import {
  validateRepairSourceTransformHint,
} from "../../../../../packages/project-model/src/index.js";
import {
  SCRIPT_REPAIR_HINT_ANALYZER_ID,
  SCRIPT_REPAIR_HINT_ANALYZER_REVISION,
  SCRIPT_REPAIR_HINT_PARSER_ID,
  SCRIPT_REPAIR_HINT_PARSER_REVISION,
} from "../../repair/repair-transform-hints.js";

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

const START_OWNER_PROPERTY =
  /^(?:startOwner|startOwnerId|startToken|startGenerationOwner)$/i;
const GENERATION_PROPERTY =
  /^(?:generation|arenaGeneration|generationId)$/i;
const START_STATE_PROPERTY =
  /^(?:started|active|state|status|phase)$/i;
const START_STATE_VALUE =
  /^(?:true|starting|countdown|active|started|running)$/i;

function propertyName(
  node: ts.PropertyName | undefined,
): string | undefined {
  if (!node) return undefined;
  return ts.isIdentifier(node) ||
      ts.isStringLiteralLike(node)
    ? node.text
    : undefined;
}

function authoredOwnerSentinel(
  method: ts.MethodDeclaration,
): {
  property: string;
  sentinel: "null" | "undefined";
} | undefined {
  const container = method.parent;
  if (
    !ts.isClassDeclaration(container) &&
    !ts.isClassExpression(container)
  ) {
    return undefined;
  }

  for (const member of container.members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    const name = propertyName(member.name);
    if (
      !name ||
      !START_OWNER_PROPERTY.test(name) ||
      !member.initializer
    ) {
      continue;
    }

    if (
      member.initializer.kind ===
        ts.SyntaxKind.NullKeyword
    ) {
      return {
        property: name,
        sentinel: "null",
      };
    }
    if (
      ts.isIdentifier(member.initializer) &&
      member.initializer.text ===
        "undefined"
    ) {
      return {
        property: name,
        sentinel: "undefined",
      };
    }
  }

  return undefined;
}

function startGenerationDeclaration(
  statement: ts.Statement,
  file: ts.SourceFile,
):
  | {
      identifier: string;
      generationExpression: string;
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
    declaration.initializer.expression.kind !==
      ts.SyntaxKind.ThisKeyword ||
    !GENERATION_PROPERTY.test(
      declaration.initializer.name.text,
    )
  ) {
    return undefined;
  }

  return {
    identifier: declaration.name.text,
    generationExpression:
      declaration.initializer.getText(file),
  };
}

function exactThisAssignment(
  statement: ts.Statement,
  expectedProperty: RegExp,
  file: ts.SourceFile,
):
  | {
      property: string;
      right: ts.Expression;
      expectedText: string;
    }
  | undefined {
  if (!ts.isExpressionStatement(statement)) {
    return undefined;
  }
  const expression = statement.expression;
  if (
    !ts.isBinaryExpression(expression) ||
    expression.operatorToken.kind !==
      ts.SyntaxKind.EqualsToken ||
    !ts.isPropertyAccessExpression(
      expression.left,
    ) ||
    expression.left.expression.kind !==
      ts.SyntaxKind.ThisKeyword ||
    !expectedProperty.test(
      expression.left.name.text,
    )
  ) {
    return undefined;
  }

  return {
    property: expression.left.name.text,
    right: expression.right,
    expectedText: statement.getText(file),
  };
}

function startStateAssignment(
  statement: ts.Statement,
  file: ts.SourceFile,
): boolean {
  const assignment = exactThisAssignment(
    statement,
    START_STATE_PROPERTY,
    file,
  );
  if (!assignment) return false;

  const right = assignment.right;
  if (
    right.kind === ts.SyntaxKind.TrueKeyword
  ) {
    return true;
  }
  if (
    ts.isStringLiteralLike(right) ||
    ts.isNoSubstitutionTemplateLiteral(right)
  ) {
    return START_STATE_VALUE.test(right.text);
  }
  return false;
}

export function deriveArenaStartOwnershipGuardTransformHints(
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
    if (
      !ts.isMethodDeclaration(node) ||
      !node.body ||
      node.body.statements.length !== 3
    ) {
      ts.forEachChild(node, visit);
      return;
    }

    const sentinel = authoredOwnerSentinel(node);
    const generation = startGenerationDeclaration(
      node.body.statements[0]!,
      file,
    );
    const owner = exactThisAssignment(
      node.body.statements[1]!,
      START_OWNER_PROPERTY,
      file,
    );
    const stateCommit = startStateAssignment(
      node.body.statements[2]!,
      file,
    );

    if (
      !sentinel ||
      !generation ||
      !owner ||
      !stateCommit ||
      owner.property !== sentinel.property ||
      !ts.isIdentifier(owner.right) ||
      owner.right.text !== generation.identifier
    ) {
      ts.forEachChild(node, visit);
      return;
    }

    const ownerSource = lineSource(
      file,
      node.body.statements[1]!,
      source,
    );
    if (
      ownerSource.range?.lineStart === undefined ||
      ownerSource.range.lineEnd === undefined ||
      ownerSource.range.lineStart !==
        ownerSource.range.lineEnd
    ) {
      ts.forEachChild(node, visit);
      return;
    }

    const methodName =
      propertyName(node.name) ??
      "anonymous-start-method";
    const replacementText =
      "if (this." +
      sentinel.property +
      " !== " +
      sentinel.sentinel +
      ") return; " +
      owner.expectedText;

    const hint: RepairSourceTransformHint = {
      schemaVersion: 1,
      id: [
        "repair-hint",
        "arena-start-ownership-guard",
        encodeURIComponent(identifier),
        encodeURIComponent(source.relativePath),
        ownerSource.range.lineStart,
        ownerSource.range.columnStart ?? 0,
      ].join(":"),
      family: "arena-ownership-guard",
      analyzerId:
        SCRIPT_REPAIR_HINT_ANALYZER_ID,
      analyzerRevision:
        SCRIPT_REPAIR_HINT_ANALYZER_REVISION,
      parserId: SCRIPT_REPAIR_HINT_PARSER_ID,
      parserRevision:
        SCRIPT_REPAIR_HINT_PARSER_REVISION,
      semanticOwnerId:
        "script:" +
        identifier +
        ":method:" +
        methodName,
      source: ownerSource,
      expectedText: owner.expectedText,
      replacementText,
      supportedPredicateIds: [
        "arena-start-ownership-violation-observed",
      ],
      supportedFactorIds: [
        "start-ownership-guard-enabled",
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

    ts.forEachChild(node, visit);
  };

  visit(file);

  return output.sort((a, b) =>
    a.id.localeCompare(b.id)
  );
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
            family: "arena-capacity-guard",
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
