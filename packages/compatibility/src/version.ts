import type { GameVersion } from "./types.js";

export function compareGameVersion(a: GameVersion, b: GameVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

export function parseGameVersion(value: unknown): GameVersion | undefined {
  if (Array.isArray(value) && value.length >= 3) {
    const [major, minor, patch] = value;
    if ([major, minor, patch].every((item) => Number.isInteger(item))) {
      return { major: Number(major), minor: Number(minor), patch: Number(patch) };
    }
  }

  if (typeof value === "string") {
    const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value.trim());
    if (match) {
      return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
      };
    }
  }

  return undefined;
}

export function formatGameVersion(version: GameVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}
