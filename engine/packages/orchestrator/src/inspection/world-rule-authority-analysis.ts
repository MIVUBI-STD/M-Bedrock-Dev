import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";
import type { SourceRef } from "../../../project-model/src/index.js";

export interface WorldRuleWrite {
  scriptId: string;
  executionRegion: string;
  rule: string;
  value: string;
  source: SourceRef;
}

export interface WorldRuleConflict {
  rule: string;
  values: readonly string[];
  writerRegions: readonly string[];
}

export type WorldRuleScriptInput =
  | ParsedScriptFile
  | {
      parsed: ParsedScriptFile;
      text?: string;
    };

export interface WorldRuleAuthorityAnalysis {
  writes: readonly WorldRuleWrite[];
  conflicts: readonly WorldRuleConflict[];
  naturalMobSpawning:
    | "disabled"
    | "enabled"
    | "conflicted"
    | "unresolved";
  scriptSpawnEntityPaths: number;
  commandSummonPaths: number;
  manualEntitySpawnPaths: number;
}

function normalized(command: string): string {
  return command.trim().replace(/^\//, "");
}

export function analyzeWorldRuleAuthority(
  scripts: readonly WorldRuleScriptInput[],
): WorldRuleAuthorityAnalysis {
  const writes: WorldRuleWrite[] = [];
  const normalizedScripts = scripts.map((item) =>
    "parsed" in item
      ? item
      : { parsed: item, text: undefined }
  );

  for (const item of normalizedScripts) {
    const script = item.parsed;
    for (const command of script.commandLiterals) {
      const text = normalized(command.command);
      const match = /^gamerule\s+(\S+)\s+(\S+)/i.exec(text);
      if (!match) continue;
      writes.push({
        scriptId: script.identifier,
        executionRegion: command.executionRegion ?? "module",
        rule: match[1]!,
        value: match[2]!,
        source: command.source,
      });
    }

    const text = item.text ?? "";
    const propertyPattern =
      /\b(doMobSpawning|doDaylightCycle|doWeatherCycle|keepInventory|mobGriefing|naturalRegeneration|pvp|sendCommandFeedback|fallDamage|showTags)\s*(?:=|:)\s*(true|false|-?\d+)\b/gi;
    for (const match of text.matchAll(propertyPattern)) {
      writes.push({
        scriptId: script.identifier,
        executionRegion: "module-or-runtime-property-write",
        rule: match[1]!,
        value: match[2]!,
        source: script.source,
      });
    }
  }

  const byRule = new Map<string, WorldRuleWrite[]>();
  for (const write of writes) {
    const key = write.rule.toLowerCase();
    byRule.set(key, [...(byRule.get(key) ?? []), write]);
  }

  const conflicts: WorldRuleConflict[] = [];
  for (const [rule, ruleWrites] of byRule) {
    const values = [...new Set(
      ruleWrites.map((item) => item.value.toLowerCase()),
    )].sort();
    if (values.length <= 1) continue;
    conflicts.push({
      rule,
      values,
      writerRegions: [...new Set(
        ruleWrites.map(
          (item) => item.scriptId + ":" + item.executionRegion,
        ),
      )].sort(),
    });
  }

  const mobWrites = byRule.get("domobspawning") ?? [];
  const mobValues = [...new Set(
    mobWrites.map((item) => item.value.toLowerCase()),
  )];
  const naturalMobSpawning =
    mobValues.length === 0
      ? "unresolved" as const
      : mobValues.length > 1
        ? "conflicted" as const
        : ["false", "0"].includes(mobValues[0]!)
          ? "disabled" as const
          : ["true", "1"].includes(mobValues[0]!)
            ? "enabled" as const
            : "unresolved" as const;

  const parsedScripts = normalizedScripts.map(
    (item) => item.parsed,
  );
  const scriptSpawnEntityPaths = parsedScripts.reduce(
    (sum, script) =>
      sum +
      script.methodCalls.filter(
        (call) => call.method === "spawnEntity",
      ).length,
    0,
  );
  const parsedCommandSummonPaths = parsedScripts.reduce(
    (sum, script) =>
      sum +
      script.commandLiterals.filter((command) =>
        /^\/?summon\b/i.test(command.command.trim())
      ).length,
    0,
  );
  const rawSummonPaths = normalizedScripts.reduce(
    (sum, item) =>
      sum +
      (
        item.text?.match(
          /["'`]\/?summon\s+[^"'\`\r\n]+["'`]/gi,
        )?.length ?? 0
      ),
    0,
  );
  const commandSummonPaths =
    Math.max(
      parsedCommandSummonPaths,
      rawSummonPaths,
    );

  return {
    writes: writes.sort((a, b) =>
      a.rule.localeCompare(b.rule) ||
      a.scriptId.localeCompare(b.scriptId) ||
      a.executionRegion.localeCompare(b.executionRegion)
    ),
    conflicts: conflicts.sort((a, b) =>
      a.rule.localeCompare(b.rule)
    ),
    naturalMobSpawning,
    scriptSpawnEntityPaths,
    commandSummonPaths,
    manualEntitySpawnPaths:
      scriptSpawnEntityPaths + commandSummonPaths,
  };
}
