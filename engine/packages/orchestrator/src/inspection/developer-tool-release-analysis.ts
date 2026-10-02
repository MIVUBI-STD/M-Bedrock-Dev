import type {
  ParsedScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import {
  assessCapabilityExposure,
  findGameplayReachability,
  type CapabilityExposureAssessment,
  type GameplayReachabilityGraph,
} from "../../../diagnostic-reasoning/src/index.js";

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
  readonly exposure:
    CapabilityExposureAssessment;
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
  /["'`](minecraft:[a-z0-9_./-]+)["'`]/gi;

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
    const value = match[1]
      ?.toLowerCase();
    if (value) items.add(value);
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
  reachability?: GameplayReachabilityGraph,
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

    const authorization =
      permissionGuard === "present"
        ? "required-and-enforced" as const
        : permissionGuard === "absent"
          ? "required-but-missing" as const
          : "unknown" as const;
    const impact =
      kind === "level-skip" ||
      kind === "level-retry"
        ? "progression" as const
        : kind === "debug-interaction"
          ? "interaction" as const
          : "state" as const;
    const prerequisitePaths =
      triggerItems.map((item) =>
        reachability === undefined
          ? {
              reachable: false,
              targetId: "item:" + item,
              nodeIds: [],
              edgeKinds: [],
              evidenceIds: [],
            }
          : findGameplayReachability(
              reachability,
              "item:" + item,
            )
      );

    const exposure =
      assessCapabilityExposure({
        capabilityId:
          "developer-tool:" +
          parsed.identifier +
          ":" +
          kind,
        capabilityLabel:
          parsed.identifier +
          " " +
          kind,
        releaseEnabled,
        authorization,
        triggerPresent:
          interactions.length > 0,
        prerequisitePaths,
        playerImpact: impact,
        evidenceIds: [
          parsed.source.relativePath,
        ],
      });

    const severityHint =
      exposure.status === "exposed" &&
      impact === "progression"
        ? "high" as const
        : exposure.status === "exposed" ||
          exposure.status ===
            "potentially-exposed"
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
        ...exposure.reasons,
      ],
      severityHint,
      exposure,
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
          item.releaseEnabled === "enabled" &&
          item.permissionGuard === "absent" &&
          (
            item.exposure.impact === "progression" ||
            item.exposure.impact === "state" ||
            item.exposure.impact === "fairness"
          ),
      ).length,
  };
}
