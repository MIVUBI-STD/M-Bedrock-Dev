export type MultiplayerStaticRiskCode =
  | "MULTIPLAYER_FIRST_PLAYER_ASSUMPTION"
  | "NONDETERMINISTIC_PLAYER_SELECTOR"
  | "HOT_LOOP_ALL_PLAYERS";

export interface MultiplayerStaticRisk {
  code: MultiplayerStaticRiskCode;
  severity: "major" | "minor";
  line: number;
  excerpt: string;
  reason: string;
}

export interface MultiplayerStaticRiskAnalysis {
  risks: readonly MultiplayerStaticRisk[];
  major: number;
  minor: number;
}

const RULES: readonly {
  code: MultiplayerStaticRiskCode;
  severity: MultiplayerStaticRisk["severity"];
  pattern: RegExp;
  reason: string;
}[] = [
  {
    code: "MULTIPLAYER_FIRST_PLAYER_ASSUMPTION",
    severity: "major",
    pattern: /(?:getPlayers\s*\(\s*\)|\bplayers)\s*\[\s*0\s*\]/,
    reason: "Logic selects the first available player instead of an explicit arena/session participant.",
  },
  {
    code: "NONDETERMINISTIC_PLAYER_SELECTOR",
    severity: "major",
    pattern: /(?:^|\s)@(?:p|r)(?:\b|\[)/,
    reason: "Nearest/random player selectors are not deterministic arena ownership evidence.",
  },
  {
    code: "HOT_LOOP_ALL_PLAYERS",
    severity: "minor",
    pattern: /(?:runInterval|setInterval)[\s\S]{0,240}(?:getPlayers\s*\(\s*\)|for\s*\([^)]*\bplayers\b)/,
    reason: "Frequent global-player iteration can scale poorly and should be justified or partitioned.",
  },
];

export function analyzeMultiplayerStaticRisks(
  sourceText: string,
): MultiplayerStaticRiskAnalysis {
  const risks: MultiplayerStaticRisk[] = [];
  const lines = sourceText.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const local = lines.slice(index, Math.min(lines.length, index + 8)).join("\n");
    for (const rule of RULES) {
      if (!rule.pattern.test(local)) continue;
      if (risks.some((item) => item.code === rule.code && item.line === index + 1)) {
        continue;
      }
      risks.push({
        code: rule.code,
        severity: rule.severity,
        line: index + 1,
        excerpt: lines[index]!.trim().slice(0, 240),
        reason: rule.reason,
      });
    }
  }

  return {
    risks,
    major: risks.filter((item) => item.severity === "major").length,
    minor: risks.filter((item) => item.severity === "minor").length,
  };
}
