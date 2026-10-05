import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";

export interface PlayerCapabilityProtectionDefinition {
  scriptId: string;
  name: string;
  instantiated: boolean;
}

export interface PlayerCapabilitySurfaceAnalysis {
  gamemodeWrites: number;
  creativeModeGrants: number;
  spectatorModeGrants: number;
  abilityWrites: number;
  commandPermissionWrites: number;
  privilegedGuardReferences: number;
  privilegedBypassReturns: number;
  protectionDefinitions:
    readonly PlayerCapabilityProtectionDefinition[];
  inactiveProtectionDefinitions: number;
}

function commandIsCapabilityWrite(command: string): boolean {
  return /^\/?ability\s+\S+\s+(?:mayfly|worldbuilder|mute)\s+(?:true|false)\b/i.test(
    command.trim(),
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");
}

export function analyzePlayerCapabilitySurfaces(
  scripts: readonly {
    parsed: ParsedScriptFile;
    text?: string;
  }[],
): PlayerCapabilitySurfaceAnalysis {
  const parsed = scripts.map((item) => item.parsed);
  const texts = scripts
    .map((item) => item.text ?? "")
    .filter(Boolean);

  const gamemodeWrites =
    parsed.reduce(
      (sum, script) =>
        sum +
        script.methodCalls.filter(
          (call) => call.method === "setGameMode",
        ).length +
        script.commandLiterals.filter((command) =>
          /^\/?gamemode\b/i.test(command.command.trim())
        ).length,
      0,
    );

  const creativeModeGrants =
    parsed.reduce(
      (sum, script) =>
        sum +
        script.methodCalls.filter(
          (call) =>
            call.method === "setGameMode" &&
            /creative/i.test(
              call.argumentTexts?.[0] ?? "",
            ),
        ).length +
        script.commandLiterals.filter((command) =>
          /^\/?gamemode\s+creative\b/i.test(
            command.command.trim(),
          )
        ).length,
      0,
    );

  const spectatorModeGrants =
    parsed.reduce(
      (sum, script) =>
        sum +
        script.methodCalls.filter(
          (call) =>
            call.method === "setGameMode" &&
            /spectator/i.test(
              call.argumentTexts?.[0] ?? "",
            ),
        ).length +
        script.commandLiterals.filter((command) =>
          /^\/?gamemode\s+spectator\b/i.test(
            command.command.trim(),
          )
        ).length,
      0,
    );

  const abilityWrites =
    parsed.reduce(
      (sum, script) =>
        sum +
        script.commandLiterals.filter((command) =>
          commandIsCapabilityWrite(command.command)
        ).length,
      0,
    );

  const commandPermissionWrites =
    parsed.reduce(
      (sum, script) =>
        sum +
        script.propertyWrites.filter(
          (write) =>
            write.receiverType === "Player" &&
            /commandPermissionLevel/i.test(write.property),
        ).length,
      0,
    );

  const privilegedGuardReferences = texts.reduce(
    (sum, text) =>
      sum +
      (
        text.match(
          /\bisAdmin\s*\(|hasTag\s*\(\s*["'](?:admin|roommaster|developer)["']|\broommaster\b|\bcommandPermissionLevel\b/gi,
        )?.length ?? 0
      ),
    0,
  );

  const privilegedBypassReturns = texts.reduce(
    (sum, text) =>
      sum +
      (
        text.match(
          /if\s*\([^\n]{0,180}(?:isAdmin\s*\(|hasTag\s*\(\s*["'](?:admin|roommaster|developer)["']|roommaster)[^\n]{0,180}\)\s*(?:\{\s*)?return(?:\s+true)?\s*;/gi,
        )?.length ?? 0
      ),
    0,
  );

  const definitions: {
    scriptId: string;
    name: string;
  }[] = [];
  for (const item of scripts) {
    const text = item.text ?? "";
    const classPattern =
      /class\s+([A-Za-z_$][\w$]*(?:AntiCheat|Guard|Protection|Permission|Security)[A-Za-z_$\w]*)\b|class\s+((?:AntiCheat|Guard|Protection|Permission|Security)[A-Za-z_$\w]*)\b/g;
    for (const match of text.matchAll(classPattern)) {
      const name = match[1] ?? match[2];
      if (!name) continue;
      definitions.push({
        scriptId: item.parsed.identifier,
        name,
      });
    }
  }

  const allText = texts.join("\n");
  const protectionDefinitions =
    definitions
      .filter((item, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.scriptId === item.scriptId &&
            candidate.name === item.name,
        ) === index
      )
      .map((item) => ({
        ...item,
        instantiated:
          new RegExp(
            "\\bnew\\s+" +
              escapeRegex(item.name) +
              "\\s*\\(",
          ).test(allText),
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name) ||
        a.scriptId.localeCompare(b.scriptId)
      );

  return {
    gamemodeWrites,
    creativeModeGrants,
    spectatorModeGrants,
    abilityWrites,
    commandPermissionWrites,
    privilegedGuardReferences,
    privilegedBypassReturns,
    protectionDefinitions,
    inactiveProtectionDefinitions:
      protectionDefinitions.filter(
        (item) => !item.instantiated,
      ).length,
  };
}
