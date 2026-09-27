import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { KnowledgeCatalog } from "../../knowledge/src/index.js";
import type {
  InspectTargetProfile,
} from "./types.js";
import {
  inspectArtifact,
} from "./inspect-artifact.js";
import {
  compareGameplayUnderstandingFingerprints,
  deriveGameplayUnderstandingFingerprint,
  type GameplayUnderstandingFingerprint,
  type GameplayUnderstandingFingerprintDrift,
} from "./gameplay-understanding-fingerprint.js";

export type GameplayCalibrationSourceStyle =
  | "explicit-source"
  | "modular-compiled"
  | "bundled-minified"
  | "mixed";

export interface GameplayCalibrationCase {
  id: string;
  label: string;
  artifactFile: string;
  sourceStyle: GameplayCalibrationSourceStyle;
  learningDimensions: readonly string[];
  note?: string;
}

export interface GameplayCalibrationManifest {
  schemaVersion: 1;
  id: string;
  cases: readonly GameplayCalibrationCase[];
}

export interface GameplayCalibrationCaseReport {
  id: string;
  label: string;
  sourceStyle: GameplayCalibrationSourceStyle;
  learningDimensions: readonly string[];
  note?: string;
  fingerprint: GameplayUnderstandingFingerprint;
}

export interface GameplayCalibrationAggregate {
  caseCount: number;
  sourceStyles: Readonly<Record<string, number>>;
  learningDimensions: Readonly<Record<string, number>>;
  mapsWithUnknownIntent: number;
  totalUnknownIntent: number;
  totalNodes: number;
  totalAuthoredNodes: number;
  totalInferredNodes: number;
  intentKindPresence: Readonly<Record<string, number>>;
  routeProfileCases: number;
  routePointTotal: number;
}

export interface GameplayCalibrationReport {
  schemaVersion: 1;
  corpusId: string;
  cases: readonly GameplayCalibrationCaseReport[];
  aggregate: GameplayCalibrationAggregate;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function nonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

export function parseGameplayCalibrationManifest(
  input: unknown,
): GameplayCalibrationManifest {
  if (!isRecord(input)) {
    throw new Error(
      "Gameplay calibration manifest must be an object.",
    );
  }
  if (input.schemaVersion !== 1) {
    throw new Error(
      "Gameplay calibration manifest schemaVersion must be 1.",
    );
  }
  if (!nonEmptyString(input.id)) {
    throw new Error(
      "Gameplay calibration manifest id must be a non-empty string.",
    );
  }
  if (!Array.isArray(input.cases)) {
    throw new Error(
      "Gameplay calibration manifest cases must be an array.",
    );
  }

  const ids = new Set<string>();
  const cases: GameplayCalibrationCase[] =
    input.cases.map((raw, index) => {
      if (!isRecord(raw)) {
        throw new Error(
          "Gameplay calibration case " +
          index +
          " must be an object.",
        );
      }
      if (!nonEmptyString(raw.id)) {
        throw new Error(
          "Gameplay calibration case " +
          index +
          " id must be a non-empty string.",
        );
      }
      if (ids.has(raw.id)) {
        throw new Error(
          "Duplicate gameplay calibration case id: " +
          raw.id,
        );
      }
      ids.add(raw.id);

      if (!nonEmptyString(raw.label)) {
        throw new Error(
          "Gameplay calibration case " +
          raw.id +
          " label must be a non-empty string.",
        );
      }
      if (!nonEmptyString(raw.artifactFile)) {
        throw new Error(
          "Gameplay calibration case " +
          raw.id +
          " artifactFile must be a non-empty string.",
        );
      }
      if (
        raw.sourceStyle !== "explicit-source" &&
        raw.sourceStyle !== "modular-compiled" &&
        raw.sourceStyle !== "bundled-minified" &&
        raw.sourceStyle !== "mixed"
      ) {
        throw new Error(
          "Gameplay calibration case " +
          raw.id +
          " has unsupported sourceStyle.",
        );
      }
      if (
        !Array.isArray(raw.learningDimensions) ||
        raw.learningDimensions.length === 0 ||
        !raw.learningDimensions.every(nonEmptyString)
      ) {
        throw new Error(
          "Gameplay calibration case " +
          raw.id +
          " learningDimensions must contain non-empty strings.",
        );
      }
      if (
        raw.note !== undefined &&
        !nonEmptyString(raw.note)
      ) {
        throw new Error(
          "Gameplay calibration case " +
          raw.id +
          " note must be a non-empty string when provided.",
        );
      }

      return {
        id: raw.id,
        label: raw.label,
        artifactFile: raw.artifactFile,
        sourceStyle: raw.sourceStyle,
        learningDimensions: [
          ...new Set(raw.learningDimensions),
        ].sort(),
        ...(raw.note === undefined
          ? {}
          : { note: raw.note }),
      };
    });

  return {
    schemaVersion: 1,
    id: input.id,
    cases,
  };
}

export async function loadGameplayCalibrationManifest(
  path: string,
): Promise<GameplayCalibrationManifest> {
  return parseGameplayCalibrationManifest(
    JSON.parse(
      await readFile(path, "utf8"),
    ) as unknown,
  );
}

function aggregateGameplayCalibration(
  cases: readonly GameplayCalibrationCaseReport[],
): GameplayCalibrationAggregate {
  const sourceStyles: Record<string, number> = {};
  const learningDimensions: Record<string, number> = {};
  const intentKindPresence: Record<string, number> = {};

  let mapsWithUnknownIntent = 0;
  let totalUnknownIntent = 0;
  let totalNodes = 0;
  let totalAuthoredNodes = 0;
  let totalInferredNodes = 0;
  let routeProfileCases = 0;
  let routePointTotal = 0;

  for (const item of cases) {
    sourceStyles[item.sourceStyle] =
      (sourceStyles[item.sourceStyle] ?? 0) + 1;

    for (const dimension of item.learningDimensions) {
      learningDimensions[dimension] =
        (learningDimensions[dimension] ?? 0) + 1;
    }

    const fingerprint = item.fingerprint;
    if (fingerprint.totals.unknowns > 0) {
      mapsWithUnknownIntent += 1;
    }
    totalUnknownIntent +=
      fingerprint.totals.unknowns;
    totalNodes += fingerprint.totals.nodes;
    totalAuthoredNodes +=
      fingerprint.nodeStatuses.authored;
    totalInferredNodes +=
      fingerprint.nodeStatuses.inferred;

    if (fingerprint.spatial.routeProfiles > 0) {
      routeProfileCases += 1;
    }
    routePointTotal +=
      fingerprint.spatial.routePoints;

    for (
      const [kind, count] of
      Object.entries(fingerprint.nodeKinds)
    ) {
      if (count > 0) {
        intentKindPresence[kind] =
          (intentKindPresence[kind] ?? 0) + 1;
      }
    }
  }

  const sorted = (
    value: Record<string, number>,
  ): Readonly<Record<string, number>> =>
    Object.fromEntries(
      Object.entries(value).sort(
        ([a], [b]) => a.localeCompare(b),
      ),
    );

  return {
    caseCount: cases.length,
    sourceStyles: sorted(sourceStyles),
    learningDimensions:
      sorted(learningDimensions),
    mapsWithUnknownIntent,
    totalUnknownIntent,
    totalNodes,
    totalAuthoredNodes,
    totalInferredNodes,
    intentKindPresence:
      sorted(intentKindPresence),
    routeProfileCases,
    routePointTotal,
  };
}

export async function calibrateGameplayCorpus(
  manifest: GameplayCalibrationManifest,
  artifactRoot: string,
  target: InspectTargetProfile = {},
  knowledgeCatalog?: KnowledgeCatalog,
): Promise<GameplayCalibrationReport> {
  const cases: GameplayCalibrationCaseReport[] = [];

  for (const item of manifest.cases) {
    const result = await inspectArtifact(
      resolve(artifactRoot, item.artifactFile),
      target,
      knowledgeCatalog,
    );

    cases.push({
      id: item.id,
      label: item.label,
      sourceStyle: item.sourceStyle,
      learningDimensions:
        item.learningDimensions,
      ...(item.note === undefined
        ? {}
        : { note: item.note }),
      fingerprint:
        deriveGameplayUnderstandingFingerprint(
          result,
        ),
    });
  }

  return {
    schemaVersion: 1,
    corpusId: manifest.id,
    cases,
    aggregate:
      aggregateGameplayCalibration(cases),
  };
}

export async function calibrateGameplayCorpusFromFile(
  manifestPath: string,
  artifactRoot?: string,
  target: InspectTargetProfile = {},
  knowledgeCatalog?: KnowledgeCatalog,
): Promise<GameplayCalibrationReport> {
  const manifest =
    await loadGameplayCalibrationManifest(
      manifestPath,
    );
  const root =
    artifactRoot ??
    dirname(resolve(manifestPath));

  return calibrateGameplayCorpus(
    manifest,
    root,
    target,
    knowledgeCatalog,
  );
}

export interface GameplayCalibrationCaseDrift {
  id: string;
  label: string;
  drift: GameplayUnderstandingFingerprintDrift;
}

export interface GameplayCalibrationReportDrift {
  corpusId: string;
  missingCaseIds: readonly string[];
  addedCaseIds: readonly string[];
  cases: readonly GameplayCalibrationCaseDrift[];
  regressionSignals: readonly string[];
}

export function compareGameplayCalibrationReports(
  baseline: GameplayCalibrationReport,
  current: GameplayCalibrationReport,
): GameplayCalibrationReportDrift {
  if (baseline.corpusId !== current.corpusId) {
    throw new Error(
      "Cannot compare gameplay calibration reports from different corpus IDs.",
    );
  }

  const baselineById = new Map(
    baseline.cases.map((item) => [
      item.id,
      item,
    ]),
  );
  const currentById = new Map(
    current.cases.map((item) => [
      item.id,
      item,
    ]),
  );

  const missingCaseIds = [
    ...baselineById.keys(),
  ]
    .filter((id) => !currentById.has(id))
    .sort();
  const addedCaseIds = [
    ...currentById.keys(),
  ]
    .filter((id) => !baselineById.has(id))
    .sort();

  const cases: GameplayCalibrationCaseDrift[] = [];
  for (const [id, baselineCase] of baselineById) {
    const currentCase = currentById.get(id);
    if (!currentCase) continue;

    cases.push({
      id,
      label: currentCase.label,
      drift:
        compareGameplayUnderstandingFingerprints(
          baselineCase.fingerprint,
          currentCase.fingerprint,
        ),
    });
  }

  const regressionSignals = new Set<string>();
  if (missingCaseIds.length > 0) {
    regressionSignals.add(
      "calibration-cases-missing",
    );
  }
  for (const item of cases) {
    for (
      const signal of
      item.drift.regressionSignals
    ) {
      regressionSignals.add(signal);
    }
  }

  return {
    corpusId: baseline.corpusId,
    missingCaseIds,
    addedCaseIds,
    cases: cases.sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    regressionSignals: [
      ...regressionSignals,
    ].sort(),
  };
}
