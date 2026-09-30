export interface ParsedScriptSemver {
  major: number;
  minor: number;
  patch: number;
  prerelease: readonly string[];
}

function numericParts(value: string): readonly number[] | undefined {
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d+)*$/.test(trimmed)) return undefined;
  return trimmed.split(".").map((part) => Number(part));
}

export function compareDottedNumericVersions(
  left: string,
  right: string,
): number | undefined {
  const a = numericParts(left);
  const b = numericParts(right);
  if (!a || !b) return undefined;

  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) return delta < 0 ? -1 : 1;
  }
  return 0;
}

export function parseScriptSemver(
  value: string,
): ParsedScriptSemver | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(
    value.trim(),
  );
  if (!match) return undefined;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split(".") ?? [],
  };
}

function comparePrereleaseIdentifier(
  left: string,
  right: string,
): number {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);

  if (leftNumeric && rightNumeric) {
    const delta = Number(left) - Number(right);
    return delta === 0 ? 0 : delta < 0 ? -1 : 1;
  }
  if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
  return left.localeCompare(right);
}

export function compareScriptSemver(
  left: string,
  right: string,
): number | undefined {
  const a = parseScriptSemver(left);
  const b = parseScriptSemver(right);
  if (!a || !b) return undefined;

  for (const key of ["major", "minor", "patch"] as const) {
    const delta = a[key] - b[key];
    if (delta !== 0) return delta < 0 ? -1 : 1;
  }

  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;
  if (a.prerelease.length === 0) return 1;
  if (b.prerelease.length === 0) return -1;

  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = a.prerelease[index];
    const rightPart = b.prerelease[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;

    const delta = comparePrereleaseIdentifier(leftPart, rightPart);
    if (delta !== 0) return delta < 0 ? -1 : 1;
  }
  return 0;
}
