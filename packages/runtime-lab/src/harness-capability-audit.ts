import ts from "typescript";
import type {
  RuntimeActionCapability,
  RuntimeActionCapabilityRegistry,
} from "./action-capability.js";

type LiteralValue =
  | string
  | number
  | boolean
  | null
  | LiteralValue[]
  | { [key: string]: LiteralValue };

function literalValue(
  node: ts.Expression,
): LiteralValue | undefined {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isNumericLiteral(node)) {
    const value = Number(node.text);
    return Number.isFinite(value) ? value : undefined;
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;

  if (ts.isArrayLiteralExpression(node)) {
    const values: LiteralValue[] = [];
    for (const item of node.elements) {
      if (ts.isSpreadElement(item)) return undefined;
      const value = literalValue(item);
      if (value === undefined) return undefined;
      values.push(value);
    }
    return values;
  }

  if (ts.isObjectLiteralExpression(node)) {
    const value: Record<string, LiteralValue> = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) return undefined;
      const name =
        ts.isIdentifier(property.name) ||
        ts.isStringLiteralLike(property.name) ||
        ts.isNumericLiteral(property.name)
          ? property.name.text
          : undefined;
      if (!name) return undefined;
      const child = literalValue(property.initializer);
      if (child === undefined) return undefined;
      value[name] = child;
    }
    return value;
  }

  return undefined;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" +
      Object.keys(record)
        .sort()
        .map((key) =>
          JSON.stringify(key) + ":" + canonical(record[key])
        )
        .join(",") +
      "}";
  }
  return JSON.stringify(value);
}

function isCapability(
  value: unknown,
): value is RuntimeActionCapability {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    (
      item.requiredContext === "LOCAL_MINECRAFT" ||
      item.requiredContext === "LIVE_MINECRAFT"
    ) &&
    (
      item.mutationRisk === "read-only" ||
      item.mutationRisk === "guarded" ||
      item.mutationRisk === "mutating"
    ) &&
    Array.isArray(item.phases)
  );
}

export interface HarnessCapabilityExtractionOptions {
  spreadCapabilities?: Readonly<
    Record<
      string,
      readonly RuntimeActionCapability[]
    >
  >;
}

export interface HarnessCapabilityExtraction {
  registry?: RuntimeActionCapabilityRegistry;
  unresolvedSpreadSources: readonly string[];
  errors: readonly string[];
}

export function extractHarnessCapabilities(
  sourceText: string,
  path = "action.js",
  options: HarnessCapabilityExtractionOptions = {},
): HarnessCapabilityExtraction {
  const file = ts.createSourceFile(
    path,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );

  let capabilities: ts.ObjectLiteralExpression | undefined;
  const unresolvedSpreadSources: string[] = [];
  const errors: string[] = [];

  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === "CAPABILITIES" &&
        declaration.initializer &&
        ts.isObjectLiteralExpression(declaration.initializer)
      ) {
        capabilities = declaration.initializer;
      }
    }
  }

  if (!capabilities) {
    return {
      unresolvedSpreadSources,
      errors: [
        "Harness CAPABILITIES object literal was not found.",
      ],
    };
  }

  const schemaProperty = capabilities.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === "schemaVersion",
  );
  const actionsProperty = capabilities.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === "actions",
  );

  const schemaVersion =
    schemaProperty &&
    ts.isPropertyAssignment(schemaProperty)
      ? literalValue(schemaProperty.initializer)
      : undefined;

  if (schemaVersion !== 1) {
    errors.push(
      "Harness CAPABILITIES schemaVersion must be 1.",
    );
  }

  if (
    !actionsProperty ||
    !ts.isPropertyAssignment(actionsProperty) ||
    !ts.isArrayLiteralExpression(actionsProperty.initializer)
  ) {
    errors.push(
      "Harness CAPABILITIES.actions must be an array literal.",
    );
    return {
      unresolvedSpreadSources,
      errors,
    };
  }

  const actions: RuntimeActionCapability[] = [];

  for (const element of actionsProperty.initializer.elements) {
    if (ts.isSpreadElement(element)) {
      const expression = element.expression.getText(file);
      const supplied =
        options.spreadCapabilities?.[expression];
      if (supplied) {
        actions.push(...supplied);
      } else {
        unresolvedSpreadSources.push(expression);
      }
      continue;
    }

    const value = literalValue(element);
    if (!isCapability(value)) {
      errors.push(
        "Harness capability entry is not a statically readable capability object: " +
          element.getText(file).slice(0, 120) +
          ".",
      );
      continue;
    }

    actions.push(value);
  }

  return {
    registry: {
      schemaVersion: 1,
      actions,
    },
    unresolvedSpreadSources:
      [...new Set(unresolvedSpreadSources)].sort(),
    errors,
  };
}

export interface HarnessCapabilityParity {
  ok: boolean;
  missingInHarness: readonly string[];
  extraInHarness: readonly string[];
  signatureMismatches: readonly string[];
  unresolvedHarnessGroups: readonly string[];
  errors: readonly string[];
}

export function compareHarnessCapabilities(
  canonicalRegistry: RuntimeActionCapabilityRegistry,
  harness: HarnessCapabilityExtraction,
): HarnessCapabilityParity {
  const canonicalById = new Map(
    canonicalRegistry.actions.map((item) => [item.id, item]),
  );
  const harnessById = new Map(
    (harness.registry?.actions ?? []).map((item) => [item.id, item]),
  );

  const missingInHarness = [...canonicalById.keys()]
    .filter((id) => !harnessById.has(id))
    .sort();

  const extraInHarness = [...harnessById.keys()]
    .filter((id) => !canonicalById.has(id))
    .sort();

  const signatureMismatches = [...canonicalById.keys()]
    .filter((id) => {
      const harnessItem = harnessById.get(id);
      return (
        harnessItem !== undefined &&
        canonical(canonicalById.get(id)) !== canonical(harnessItem)
      );
    })
    .sort();

  return {
    ok:
      harness.errors.length === 0 &&
      missingInHarness.length === 0 &&
      extraInHarness.length === 0 &&
      signatureMismatches.length === 0 &&
      harness.unresolvedSpreadSources.length === 0,
    missingInHarness,
    extraInHarness,
    signatureMismatches,
    unresolvedHarnessGroups:
      harness.unresolvedSpreadSources,
    errors: harness.errors,
  };
}
