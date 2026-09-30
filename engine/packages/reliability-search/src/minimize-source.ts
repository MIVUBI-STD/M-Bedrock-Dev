import { ddmin } from "./minimize.js";

export interface SourceMinimizeResult {
  minimizedText: string;
  evaluations: number;
  originalLines: number;
  minimizedLines: number;
}

export async function minimizeSourceLines(
  source: string,
  stillFails: (candidateSource: string) => boolean | Promise<boolean>,
): Promise<SourceMinimizeResult> {
  const lines = source.split(/\r?\n/);
  const result = await ddmin(
    lines,
    async (candidate) => await stillFails(candidate.join("\n")),
  );

  return {
    minimizedText: result.minimized.join("\n"),
    evaluations: result.evaluations,
    originalLines: result.originalLength,
    minimizedLines: result.minimizedLength,
  };
}
