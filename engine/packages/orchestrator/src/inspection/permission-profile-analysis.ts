import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";

export interface CustomCommandPermissionEvidence {
  commandId?: string;
  permissionLevel?: string;
  registrationSource: ParsedScriptFile["source"];
}

export interface PermissionProfileAnalysis {
  playerPermissionReferences: string[];
  commandPermissionReferences: string[];
  customCommands: CustomCommandPermissionEvidence[];
  devCommandsWithoutExplicitPermission: number;
}

export function analyzePermissionProfile(
  scripts: readonly { parsed: ParsedScriptFile; text?: string }[],
): PermissionProfileAnalysis {
  const player = new Set<string>();
  const command = new Set<string>();
  const customCommands: CustomCommandPermissionEvidence[] = [];

  for (const item of scripts) {
    const text = item.text ?? "";
    for (const match of text.matchAll(/PlayerPermissionLevel\.([A-Za-z_][\w]*)/g)) {
      if (match[1]) player.add(match[1]);
    }
    for (const match of text.matchAll(/CommandPermissionLevel\.([A-Za-z_][\w]*)/g)) {
      if (match[1]) command.add(match[1]);
    }
    const pattern = /registerCommand\s*\(\s*\{([\s\S]{0,1200}?)\}\s*,/g;
    for (const match of text.matchAll(pattern)) {
      const body = match[1] ?? "";
      const name = /\bname\s*:\s*["']([^"']+)["']/.exec(body)?.[1];
      const level = /\bpermissionLevel\s*:\s*(?:CommandPermissionLevel\.)?([A-Za-z_][\w]*)/.exec(body)?.[1];
      customCommands.push({
        ...(name ? { commandId: name } : {}),
        ...(level ? { permissionLevel: level } : {}),
        registrationSource: item.parsed.source,
      });
    }
  }

  return {
    playerPermissionReferences: [...player].sort(),
    commandPermissionReferences: [...command].sort(),
    customCommands,
    devCommandsWithoutExplicitPermission: customCommands.filter(
      (item) =>
        item.permissionLevel === undefined &&
        /(?:debug|dev|admin|skip|test)/i.test(item.commandId ?? ""),
    ).length,
  };
}
