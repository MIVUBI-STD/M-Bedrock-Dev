export type CoordinateMode = "absolute" | "relative" | "local";

export interface CoordinateValue {
  mode: CoordinateMode;
  value: number;
}

export interface Coordinate3 {
  x: CoordinateValue;
  y: CoordinateValue;
  z: CoordinateValue;
}

export interface BlockRegion {
  from: Coordinate3;
  to: Coordinate3;
}

function parseCoordinateToken(token: string): CoordinateValue | undefined {
  if (token.startsWith("^")) {
    const value = token.length === 1 ? 0 : Number(token.slice(1));
    return Number.isFinite(value) ? { mode: "local", value } : undefined;
  }

  if (token.startsWith("~")) {
    const value = token.length === 1 ? 0 : Number(token.slice(1));
    return Number.isFinite(value) ? { mode: "relative", value } : undefined;
  }

  const value = Number(token);
  return Number.isFinite(value) ? { mode: "absolute", value } : undefined;
}

export function parseCoordinate3(tokens: readonly string[], start = 0): Coordinate3 | undefined {
  const x = tokens[start];
  const y = tokens[start + 1];
  const z = tokens[start + 2];
  if (x === undefined || y === undefined || z === undefined) return undefined;

  const px = parseCoordinateToken(x);
  const py = parseCoordinateToken(y);
  const pz = parseCoordinateToken(z);
  if (!px || !py || !pz) return undefined;

  return { x: px, y: py, z: pz };
}
