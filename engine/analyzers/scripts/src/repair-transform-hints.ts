import ts from "typescript";
import type {
  RepairSourceTransformHint,
  SourceRef,
} from "../../../packages/project-model/src/index.js";
import {
  validateRepairSourceTransformHint,
} from "../../../packages/project-model/src/index.js";

export const SCRIPT_REPAIR_HINT_ANALYZER_ID =
  "scripts:repair-transform-hints";
export const SCRIPT_REPAIR_HINT_ANALYZER_REVISION = "1";
export const SCRIPT_REPAIR_HINT_PARSER_ID = "typescript";
export const SCRIPT_REPAIR_HINT_PARSER_REVISION = ts.version;

const GENERATION_PATTERN =
  /(?:generation|epoch|revision|rev|token|sessionId|roundId|lifeId|entityId)/i;

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

function namedSystemBindings(
  file: ts.SourceFile,
): ReadonlyMap<string, string> {
  const output = new Map<string, string>();

  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteralLike(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== "@minecraft/server"
    ) {
      continue;
    }

    const bindings =
      statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) {
      continue;
    }

    for (const element of bindings.elements) {
      const imported =
        element.propertyName?.text ??
        element.name.text;
      if (imported === "system") {
        output.set(element.name.text, imported);
      }
    }
  }

  return output;
}

function schedulerKind(
  call: ts.CallExpression,
  systemBindings: ReadonlyMap<string, string>,
):
  | "run"
  | "runTimeout"
  | "runInterval"
  | undefined {
  if (!ts.isPropertyAccessExpression(call.expression)) {
    return undefined;
  }

  const method = call.expression.name.text;
  if (
    method !== "run" &&
    method !== "runTimeout" &&
    method !== "runInterval"
  ) {
    return undefined;
  }

  const receiver = call.expression.expression;
  if (!ts.isIdentifier(receiver)) return undefined;

  const canonical =
    systemBindings.get(receiver.text) ??
    receiver.text;
  return canonical === "system"
    ? method
    : undefined;
}

function inlineCallback(
  call: ts.CallExpression,
): ts.ArrowFunction | ts.FunctionExpression | undefined {
  const callback = call.arguments[0];
  return callback &&
      (
        ts.isArrowFunction(callback) ||
        ts.isFunctionExpression(callback)
      )
    ? callback
    : undefined;
}

function purePropertyAccess(
  node: ts.Expression,
): boolean {
  if (ts.isIdentifier(node)) return true;
  if (node.kind === ts.SyntaxKind.ThisKeyword) {
    return true;
  }
  return (
    ts.isPropertyAccessExpression(node) &&
    purePropertyAccess(node.expression)
  );
}

function statementContext(
  node: ts.Node,
): {
  statements: readonly ts.Statement[];
  statement: ts.Statement;
} | undefined {
  let current: ts.Node | undefined = node;

  while (current?.parent) {
    const parent: ts.Node = current.parent;
    if (
      ts.isBlock(parent) ||
      ts.isSourceFile(parent)
    ) {
      const statement = parent.statements.find(
        (item) => item === current,
      );
      if (statement) {
        return {
          statements: parent.statements,
          statement,
        };
      }
    }
    current = parent;
  }

  return undefined;
}

function capturedGeneration(
  call: ts.CallExpression,
  file: ts.SourceFile,
): {
  capturedIdentifier: string;
  currentExpression: string;
} | undefined {
  const context = statementContext(call);
  if (!context) return undefined;

  const index = context.statements.indexOf(
    context.statement,
  );
  if (index <= 0) return undefined;

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const statement = context.statements[cursor]!;
    if (!ts.isVariableStatement(statement)) continue;
    if (
      (statement.declarationList.flags &
        ts.NodeFlags.Const) === 0
    ) {
      continue;
    }

    for (
      const declaration of
        statement.declarationList.declarations
    ) {
      if (
        !ts.isIdentifier(declaration.name) ||
        !declaration.initializer ||
        !ts.isPropertyAccessExpression(
          declaration.initializer,
        ) ||
        !purePropertyAccess(
          declaration.initializer.expression,
        )
      ) {
        continue;
      }

      const capturedIdentifier =
        declaration.name.text;
      const propertyName =
        declaration.initializer.name.text;

      if (
        !GENERATION_PATTERN.test(
          capturedIdentifier,
        ) ||
        !GENERATION_PATTERN.test(propertyName)
      ) {
        continue;
      }

      return {
        capturedIdentifier,
        currentExpression:
          declaration.initializer.getText(file),
      };
    }
  }

  return undefined;
}

function callbackHasGenerationGuard(
  callback: ts.ArrowFunction | ts.FunctionExpression,
): boolean {
  let guarded = false;

  const visit = (node: ts.Node): void => {
    if (guarded) return;
    if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind;
      if (
        operator ===
          ts.SyntaxKind.EqualsEqualsToken ||
        operator ===
          ts.SyntaxKind.EqualsEqualsEqualsToken ||
        operator ===
          ts.SyntaxKind.ExclamationEqualsToken ||
        operator ===
          ts.SyntaxKind.ExclamationEqualsEqualsToken
      ) {
        const text = node.getText();
        if (GENERATION_PATTERN.test(text)) {
          guarded = true;
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(callback.body);
  return guarded;
}

function guardedCallbackText(
  callback: ts.ArrowFunction | ts.FunctionExpression,
  file: ts.SourceFile,
  capturedIdentifier: string,
  currentExpression: string,
): string {
  const callbackText = callback.getText(file);
  const body = callback.body;
  const bodyText = body.getText(file);
  const offset =
    body.getStart(file) -
    callback.getStart(file);
  const guard =
    "if (" +
    capturedIdentifier +
    " !== " +
    currentExpression +
    ") return;";

  const replacementBody = ts.isBlock(body)
    ? "{ " +
      guard +
      " " +
      bodyText.slice(1, -1).trim() +
      " }"
    : "{ " +
      guard +
      " " +
      bodyText +
      "; }";

  return (
    callbackText.slice(0, offset) +
    replacementBody +
    callbackText.slice(
      offset + bodyText.length,
    )
  );
}

function hintSemantics(
  capturedIdentifier: string,
  currentExpression: string,
): {
  family:
    | "scheduler-generation-guard"
    | "session-generation-guard";
  predicateId: string;
  factorId: string;
} {
  const token =
    capturedIdentifier + " " + currentExpression;

  if (/connection.*generation/i.test(token)) {
    return {
      family: "session-generation-guard",
      predicateId:
        "stale-session-mutation-observed",
      factorId:
        "connection-generation-guard-enabled",
    };
  }
  if (/life.*generation/i.test(token)) {
    return {
      family: "session-generation-guard",
      predicateId:
        "stale-life-join-mutation-observed",
      factorId:
        "life-generation-guard-enabled",
    };
  }
  if (
    /(?:participation|membership).*generation/i.test(
      token,
    )
  ) {
    return {
      family: "session-generation-guard",
      predicateId:
        "stale-join-transition-observed",
      factorId:
        "membership-guard-enabled",
    };
  }

  return {
    family: "scheduler-generation-guard",
    predicateId: "stale-callback-observed",
    factorId: "generation-guard-enabled",
  };
}

function hintId(
  identifier: string,
  source: SourceRef,
  family:
    | "scheduler-generation-guard"
    | "session-generation-guard",
): string {
  return [
    "repair-hint",
    family,
    encodeURIComponent(identifier),
    encodeURIComponent(source.relativePath),
    source.range?.lineStart ?? 0,
    source.range?.columnStart ?? 0,
  ].join(":");
}

interface PersistenceMarkerPattern {
  appliedIdentifier: string;
  journalIdentifier: string;
  propertyKey: string;
  sideEffectStatement: ts.ExpressionStatement;
}

function stringLiteralArgument(
  call: ts.CallExpression,
  index: number,
): string | undefined {
  const arg = call.arguments[index];
  return arg && ts.isStringLiteralLike(arg)
    ? arg.text
    : undefined;
}

function dynamicPropertyCall(
  expression: ts.Expression,
  method: "getDynamicProperty" | "setDynamicProperty",
): ts.CallExpression | undefined {
  if (!ts.isCallExpression(expression)) return undefined;
  if (
    !ts.isPropertyAccessExpression(expression.expression) ||
    expression.expression.name.text !== method
  ) {
    return undefined;
  }
  return expression;
}

function persistenceMarkerPattern(
  statement: ts.ExpressionStatement,
): PersistenceMarkerPattern | undefined {
  const parent = statement.parent;
  if (!ts.isBlock(parent)) return undefined;

  const index = parent.statements.indexOf(statement);
  if (index < 1 || index + 1 >= parent.statements.length) {
    return undefined;
  }

  const markerWriteStatement =
    parent.statements[index + 1];
  if (
    !markerWriteStatement ||
    !ts.isExpressionStatement(markerWriteStatement)
  ) {
    return undefined;
  }

  const markerWrite = dynamicPropertyCall(
    markerWriteStatement.expression,
    "setDynamicProperty",
  );
  if (!markerWrite) return undefined;

  const propertyKey = stringLiteralArgument(
    markerWrite,
    0,
  );
  const journalArgument = markerWrite.arguments[1];
  if (
    !propertyKey ||
    !/(?:applied|committed).*(?:generation|revision|version)/i.test(
      propertyKey,
    ) ||
    !journalArgument ||
    !ts.isIdentifier(journalArgument) ||
    !/(?:journal|record|operation).*(?:generation|revision|version)/i.test(
      journalArgument.text,
    )
  ) {
    return undefined;
  }

  const journalIdentifier = journalArgument.text;
  let appliedIdentifier: string | undefined;

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = parent.statements[cursor]!;
    if (!ts.isVariableStatement(candidate)) continue;
    if (
      (candidate.declarationList.flags &
        ts.NodeFlags.Const) === 0
    ) {
      continue;
    }

    for (const declaration of candidate.declarationList.declarations) {
      if (
        !ts.isIdentifier(declaration.name) ||
        !declaration.initializer
      ) {
        continue;
      }
      const read = dynamicPropertyCall(
        declaration.initializer,
        "getDynamicProperty",
      );
      if (!read) continue;
      const readKey = stringLiteralArgument(read, 0);
      if (
        readKey === propertyKey &&
        /(?:applied|committed).*(?:generation|revision|version)/i.test(
          declaration.name.text,
        )
      ) {
        appliedIdentifier = declaration.name.text;
        break;
      }
    }
    if (appliedIdentifier) break;
  }

  if (!appliedIdentifier) return undefined;

  const sideEffectCall = statement.expression;
  if (!ts.isCallExpression(sideEffectCall)) return undefined;
  if (
    dynamicPropertyCall(
      sideEffectCall,
      "setDynamicProperty",
    ) ||
    dynamicPropertyCall(
      sideEffectCall,
      "getDynamicProperty",
    )
  ) {
    return undefined;
  }

  return {
    appliedIdentifier,
    journalIdentifier,
    propertyKey,
    sideEffectStatement: statement,
  };
}

function derivePersistenceIdempotencyGuardTransformHintsFromFile(
  identifier: string,
  file: ts.SourceFile,
  source: SourceRef,
): RepairSourceTransformHint[] {
  const output: RepairSourceTransformHint[] = [];

  const visit = (node: ts.Node): void => {
    if (!ts.isExpressionStatement(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    const pattern = persistenceMarkerPattern(node);
    if (!pattern) {
      ts.forEachChild(node, visit);
      return;
    }

    const statementSource = lineSource(
      file,
      node,
      source,
    );
    if (
      statementSource.range?.lineStart === undefined ||
      statementSource.range.lineEnd === undefined ||
      statementSource.range.lineStart !==
        statementSource.range.lineEnd
    ) {
      ts.forEachChild(node, visit);
      return;
    }

    const expectedText = node.getText(file);
    const replacementText =
      "if (" +
      pattern.appliedIdentifier +
      " !== " +
      pattern.journalIdentifier +
      ") " +
      expectedText;

    const hint: RepairSourceTransformHint = {
      schemaVersion: 1,
      id: [
        "repair-hint",
        "persistence-idempotency-guard",
        encodeURIComponent(identifier),
        encodeURIComponent(source.relativePath),
        statementSource.range.lineStart,
        statementSource.range.columnStart ?? 0,
      ].join(":"),
      family: "persistence-idempotency-guard",
      analyzerId: SCRIPT_REPAIR_HINT_ANALYZER_ID,
      analyzerRevision:
        SCRIPT_REPAIR_HINT_ANALYZER_REVISION,
      parserId: SCRIPT_REPAIR_HINT_PARSER_ID,
      parserRevision:
        SCRIPT_REPAIR_HINT_PARSER_REVISION,
      semanticOwnerId:
        "script:" +
        identifier +
        ":persistence:" +
        pattern.propertyKey,
      source: statementSource,
      expectedText,
      replacementText,
      supportedPredicateIds: [
        "duplicate-apply-after-reload-observed",
      ],
      supportedFactorIds: [
        "idempotent-recovery-enabled",
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

export function derivePersistenceIdempotencyGuardTransformHints(
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
  return derivePersistenceIdempotencyGuardTransformHintsFromFile(
    identifier,
    file,
    source,
  );
}

export function deriveCapturedGenerationGuardTransformHints(
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
  const systemBindings = namedSystemBindings(file);
  const output: RepairSourceTransformHint[] = [];

  const visit = (node: ts.Node): void => {
    if (!ts.isCallExpression(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    const scheduler = schedulerKind(
      node,
      systemBindings,
    );
    const callback = inlineCallback(node);
    if (!scheduler || !callback) {
      ts.forEachChild(node, visit);
      return;
    }

    const callSource = lineSource(
      file,
      node,
      source,
    );
    if (
      callSource.range?.lineStart === undefined ||
      callSource.range.lineEnd === undefined ||
      callSource.range.lineStart !==
        callSource.range.lineEnd
    ) {
      ts.forEachChild(node, visit);
      return;
    }

    if (callbackHasGenerationGuard(callback)) {
      ts.forEachChild(node, visit);
      return;
    }

    const capture = capturedGeneration(
      node,
      file,
    );
    if (!capture) {
      ts.forEachChild(node, visit);
      return;
    }

    const semantics = hintSemantics(
      capture.capturedIdentifier,
      capture.currentExpression,
    );

    const expectedText = node.getText(file);
    const replacementCallback =
      guardedCallbackText(
        callback,
        file,
        capture.capturedIdentifier,
        capture.currentExpression,
      );
    const callbackText =
      callback.getText(file);
    const callbackOffset =
      callback.getStart(file) -
      node.getStart(file);
    const replacementText =
      expectedText.slice(0, callbackOffset) +
      replacementCallback +
      expectedText.slice(
        callbackOffset + callbackText.length,
      );

    const hint: RepairSourceTransformHint = {
      schemaVersion: 1,
      id: hintId(
        identifier,
        callSource,
        semantics.family,
      ),
      family: semantics.family,
      analyzerId:
        SCRIPT_REPAIR_HINT_ANALYZER_ID,
      analyzerRevision:
        SCRIPT_REPAIR_HINT_ANALYZER_REVISION,
      parserId: SCRIPT_REPAIR_HINT_PARSER_ID,
      parserRevision: SCRIPT_REPAIR_HINT_PARSER_REVISION,
      semanticOwnerId:
        "script:" +
        identifier +
        ":" +
        (callback.pos >= 0
          ? "callback@" +
            callSource.range.lineStart
          : "callback"),
      source: callSource,
      expectedText,
      replacementText,
      supportedPredicateIds: [
        semantics.predicateId,
      ],
      supportedFactorIds: [
        semantics.factorId,
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

export function deriveSchedulerGenerationGuardTransformHints(
  identifier: string,
  text: string,
  source: SourceRef,
): RepairSourceTransformHint[] {
  return deriveCapturedGenerationGuardTransformHints(
    identifier,
    text,
    source,
  ).filter(
    (hint) =>
      hint.family ===
        "scheduler-generation-guard",
  );
}

export function deriveSessionGenerationGuardTransformHints(
  identifier: string,
  text: string,
  source: SourceRef,
): RepairSourceTransformHint[] {
  return deriveCapturedGenerationGuardTransformHints(
    identifier,
    text,
    source,
  ).filter(
    (hint) =>
      hint.family ===
        "session-generation-guard",
  );
}
