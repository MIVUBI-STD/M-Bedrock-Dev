import type {
  ParsedScriptFile,
} from "../../../../analyzers/scripts/src/index.js";

export interface DeveloperToolExposure {
  readonly scriptId: string;
  readonly sourcePath: string;
  readonly kind:
    | "level-skip"
    | "level-retry"
    | "debug-interaction"
    | "generic-dev-tool";
  readonly triggerItems: readonly string[];
  readonly interactionEvents: readonly string[];
  readonly permissionGuard:
    | "present"
    | "absent"
    | "unknown";
  readonly releaseEnabled:
    | "enabled"
    | "disabled"
    | "unknown";
  readonly evidence: readonly string[];
  readonly severityHint:
    | "high"
    | "medium"
    | "low";
}

export interface DeveloperToolReleaseAnalysis {
  readonly exposures:
    readonly DeveloperToolExposure[];
  readonly unguardedEnabled: number;
  readonly highRisk: number;
}

const DEV_NAME =
  /(?:^|[_./-])(?:dev|debug|developer|test)(?:[_./-]|$)|dev[A-Z]|debug[A-Z]/;
const SKIP =
  /(?:skip.*level|level.*skip|devSkipLevel)/i;
const RETRY =
  /(?:retry.*level|restart.*level|level.*retry|devRetryLevel)/i;
const DEBUG_INTERACTION =
  /(?:debug.*stick|coordinate|coords?|location.*message)/i;
const PERMISSION =
  /(?:commandPermissionLevel|PlayerPermissionLevel|developerPermission|isDeveloper|hasDeveloper|devPermission|permission.*developer|developer.*permission)/i;
const DISABLED =
  /(?:devSkipLevel|devRetryLevel|debugTool|debugStick|developerTools?)\s*[:=]\s*false\b/i;
const ENABLED =
  /(?:devSkipLevel|devRetryLevel|debugTool|debugStick|developerTools?)\s*[:=]\s*true\b/i;
const ITEM_LITERAL =
  /["'`](minecraft:)?(stick|blaze_rod|blaze rod|wooden_hoe|carrot_on_a_stick|warped_fungus_on_a_stick)["'`]/gi;

function eventNames(
  script: ParsedScriptFile,
): readonly string[] {
  return script.events
    .map((event) => event.event)
    .filter((event) =>
      /(?:itemUse|playerInteractWithBlock|playerInteractWithEntity|itemStartUse|itemStopUse)/i.test(
        event,
      )
    )
    .filter(
      (value, index, values) =>
        values.indexOf(value) === index,
    )
    .sort();
}

function itemLiterals(
  text: string,
): readonly string[] {
  const items = new Set<string>();
  for (const match of text.matchAll(ITEM_LITERAL)) {
    const value = match[2]
      ?.toLowerCase()
      .replaceAll(" ", "_");
    if (value) items.add("minecraft:" + value);
  }
  return [...items].sort();
}

function kindFor(
  text: string,
): DeveloperToolExposure["kind"] {
  if (SKIP.test(text)) return "level-skip";
  if (RETRY.test(text)) return "level-retry";
  if (DEBUG_INTERACTION.test(text)) {
    return "debug-interaction";
  }
  return "generic-dev-tool";
}

export function analyzeDeveloperToolReleaseExposure(
  scripts: readonly {
    readonly parsed: ParsedScriptFile;
    readonly text?: string;
  }[],
): DeveloperToolReleaseAnalysis {
  const exposures: DeveloperToolExposure[] = [];

  for (const entry of scripts) {
    const text = entry.text ?? "";
    const parsed = entry.parsed;
    const sourcePath =
      parsed.source.relativePath;
    const devLike =
      DEV_NAME.test(parsed.identifier) ||
      DEV_NAME.test(sourcePath) ||
      SKIP.test(text) ||
      RETRY.test(text) ||
      DEBUG_INTERACTION.test(text);

    if (!devLike) continue;

    const interactions = eventNames(parsed);
    if (interactions.length === 0) continue;

    const permissionGuard =
      PERMISSION.test(text)
        ? "present" as const
        : text.length > 0
          ? "absent" as const
          : "unknown" as const;

    const releaseEnabled =
      DISABLED.test(text)
        ? "disabled" as const
        : ENABLED.test(text) ||
          interactions.length > 0
          ? "enabled" as const
          : "unknown" as const;

    const kind = kindFor(
      parsed.identifier + "\n" +
      sourcePath + "\n" +
      text,
    );
    const triggerItems = itemLiterals(text);

    const severityHint =
      releaseEnabled === "enabled" &&
      permissionGuard === "absent" &&
      (
        kind === "level-skip" ||
        kind === "level-retry"
      )
        ? "high" as const
        : releaseEnabled === "enabled" &&
          permissionGuard === "absent"
          ? "medium" as const
          : "low" as const;

    exposures.push({
      scriptId: parsed.identifier,
      sourcePath,
      kind,
      triggerItems,
      interactionEvents: interactions,
      permissionGuard,
      releaseEnabled,
      evidence: [
        "interactive developer/debug semantics detected",
        permissionGuard === "absent"
          ? "no developer-permission guard detected in the owning script"
          : "permission-related guard evidence detected",
        releaseEnabled === "enabled"
          ? "interaction subscription remains active in the release artifact"
          : "release enablement is not proven",
      ],
      severityHint,
    });
  }

  return {
    exposures,
    unguardedEnabled:
      exposures.filter(
        (item) =>
          item.releaseEnabled === "enabled" &&
          item.permissionGuard === "absent",
      ).length,
    highRisk:
      exposures.filter(
        (item) =>
          item.severityHint === "high",
      ).length,
  };
}
