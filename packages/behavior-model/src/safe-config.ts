export type SafeConfigScalar = string | number | boolean | null;
export type SafeConfigValue =
  | SafeConfigScalar
  | readonly SafeConfigValue[]
  | { readonly [key: string]: SafeConfigValue };

export type SafeConfigExpression =
  | { kind: "literal"; value: SafeConfigValue }
  | { kind: "ref"; name: string }
  | { kind: "array"; items: readonly SafeConfigExpression[] }
  | {
      kind: "object";
      entries: Readonly<Record<string, SafeConfigExpression>>;
    }
  | {
      kind: "binary";
      operator: "+" | "-" | "*" | "/";
      left: SafeConfigExpression;
      right: SafeConfigExpression;
    }
  | {
      kind: "get";
      object: SafeConfigExpression;
      key: string;
    }
  | {
      kind: "intrinsic";
      name: "translate3";
      args: readonly SafeConfigExpression[];
    };

export interface SafeConfigEnvironment {
  bindings: Readonly<Record<string, SafeConfigExpression>>;
}

export interface SafeConfigEvaluationOptions {
  maxDepth?: number;
  maxNodes?: number;
}

export class SafeConfigEvaluationError extends Error {
  constructor(
    readonly code:
      | "UNKNOWN_REFERENCE"
      | "REFERENCE_CYCLE"
      | "DEPTH_LIMIT"
      | "NODE_LIMIT"
      | "TYPE_MISMATCH"
      | "INVALID_OPERATION",
    message: string,
  ) {
    super(message);
  }
}

function asNumber(value: SafeConfigValue, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SafeConfigEvaluationError(
      "TYPE_MISMATCH",
      `${context} requires a finite number.`,
    );
  }
  return value;
}

function asObject(
  value: SafeConfigValue,
  context: string,
): { readonly [key: string]: SafeConfigValue } {
  if (
    value === null ||
    Array.isArray(value) ||
    typeof value !== "object"
  ) {
    throw new SafeConfigEvaluationError(
      "TYPE_MISMATCH",
      `${context} requires an object.`,
    );
  }
  return value as { readonly [key: string]: SafeConfigValue };
}

export function evaluateSafeConfig(
  expression: SafeConfigExpression,
  environment: SafeConfigEnvironment = { bindings: {} },
  options: SafeConfigEvaluationOptions = {},
): SafeConfigValue {
  const maxDepth = options.maxDepth ?? 64;
  const maxNodes = options.maxNodes ?? 10_000;
  let nodes = 0;
  const resolving = new Set<string>();

  const evaluate = (
    node: SafeConfigExpression,
    depth: number,
  ): SafeConfigValue => {
    nodes += 1;
    if (nodes > maxNodes) {
      throw new SafeConfigEvaluationError(
        "NODE_LIMIT",
        "Safe config evaluation exceeded the node budget.",
      );
    }
    if (depth > maxDepth) {
      throw new SafeConfigEvaluationError(
        "DEPTH_LIMIT",
        "Safe config evaluation exceeded the depth budget.",
      );
    }

    if (node.kind === "literal") return node.value;

    if (node.kind === "ref") {
      const target = environment.bindings[node.name];
      if (!target) {
        throw new SafeConfigEvaluationError(
          "UNKNOWN_REFERENCE",
          `Unknown safe config reference: ${node.name}`,
        );
      }
      if (resolving.has(node.name)) {
        throw new SafeConfigEvaluationError(
          "REFERENCE_CYCLE",
          `Safe config reference cycle includes ${node.name}.`,
        );
      }
      resolving.add(node.name);
      try {
        return evaluate(target, depth + 1);
      } finally {
        resolving.delete(node.name);
      }
    }

    if (node.kind === "array") {
      return node.items.map((item) => evaluate(item, depth + 1));
    }

    if (node.kind === "object") {
      return Object.fromEntries(
        Object.entries(node.entries)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => [key, evaluate(value, depth + 1)]),
      );
    }

    if (node.kind === "get") {
      const object = asObject(
        evaluate(node.object, depth + 1),
        "get",
      );
      if (!(node.key in object)) {
        throw new SafeConfigEvaluationError(
          "UNKNOWN_REFERENCE",
          `Safe config object does not contain key: ${node.key}`,
        );
      }
      return object[node.key]!;
    }

    if (node.kind === "binary") {
      const left = evaluate(node.left, depth + 1);
      const right = evaluate(node.right, depth + 1);
      if (
        node.operator === "+" &&
        (typeof left === "string" || typeof right === "string")
      ) {
        if (
          (typeof left !== "string" && typeof left !== "number") ||
          (typeof right !== "string" && typeof right !== "number")
        ) {
          throw new SafeConfigEvaluationError(
            "TYPE_MISMATCH",
            "String concatenation accepts only strings and numbers.",
          );
        }
        return String(left) + String(right);
      }

      const a = asNumber(left, "binary operator");
      const b = asNumber(right, "binary operator");
      if (node.operator === "+") return a + b;
      if (node.operator === "-") return a - b;
      if (node.operator === "*") return a * b;
      if (b === 0) {
        throw new SafeConfigEvaluationError(
          "INVALID_OPERATION",
          "Division by zero is not allowed.",
        );
      }
      return a / b;
    }

    const args = node.args.map((item) => evaluate(item, depth + 1));
    if (args.length !== 2) {
      throw new SafeConfigEvaluationError(
        "INVALID_OPERATION",
        "translate3 requires exactly two arguments.",
      );
    }
    const base = asObject(args[0]!, "translate3 base");
    const offset = asObject(args[1]!, "translate3 offset");
    return {
      x:
        asNumber(base.x!, "translate3 base.x") +
        asNumber(offset.x!, "translate3 offset.x"),
      y:
        asNumber(base.y!, "translate3 base.y") +
        asNumber(offset.y!, "translate3 offset.y"),
      z:
        asNumber(base.z!, "translate3 base.z") +
        asNumber(offset.z!, "translate3 offset.z"),
    };
  };

  return evaluate(expression, 0);
}
