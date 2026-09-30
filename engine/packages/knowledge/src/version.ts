function parts(version: string): number[] {
  return version.split(".").map((part) => Number.parseInt(part, 10) || 0);
}

export function compareVersions(a: string, b: string): number {
  const left = parts(a);
  const right = parts(b);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}
