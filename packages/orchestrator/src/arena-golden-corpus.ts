import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { KnowledgeCatalog } from "../../knowledge/src/index.js";
import type {
  InspectDirectoryResult,
  InspectTargetProfile,
} from "./types.js";
import { inspectArtifact } from "./inspect-artifact.js";
import { loadArenaRegionContractsFile } from "./arena-region-contract-load.js";
import type {
  ArenaReplicaProofQualityStatus,
} from "./arena-replica-proof-quality.js";
import type {
  ArenaProofConclusion,
} from "./arena-proof-conclusion.js";
import type {
  ArenaLayoutReconciliationStatus,
} from "./arena-layout-reconciliation.js";

export interface ArenaGoldenAssertions {
  arenaCount?: number;
  layoutStatus?: ArenaLayoutReconciliationStatus;
  proofConclusion?: ArenaProofConclusion;
  minCoverageRatio?: number;
  capacityOk?: boolean;
  requirePackIdentityDrift?: boolean;
  releaseStatus?: "unavailable" | "consistent" | "conflict";
  replicaStatuses?: Readonly<Record<string, ArenaReplicaProofQualityStatus>>;
}

export interface ArenaGoldenCase {
  id: string;
  label: string;
  artifactFile: string;
  regionContractsFile?: string;
  assertions: ArenaGoldenAssertions;
  note?: string;
}

export interface ArenaGoldenManifest {
  schemaVersion: 1;
  id: string;
  cases: readonly ArenaGoldenCase[];
}

export interface ArenaGoldenObservation {
  arenaCount?: number;
  detectionBasis?: "topology" | "script-config" | "reconciled";
  layoutStatus?: ArenaLayoutReconciliationStatus;
  proofConclusion?: ArenaProofConclusion;
  coverageRatio?: number;
  capacityOk?: boolean;
  packIdentityDrift: boolean;
  releaseStatus: "unavailable" | "consistent" | "conflict";
  replicaStatuses: Readonly<Record<string, ArenaReplicaProofQualityStatus>>;
}

export interface ArenaGoldenCaseReport {
  id: string;
  label: string;
  assertionFailures: readonly string[];
  observation: ArenaGoldenObservation;
  note?: string;
}

export interface ArenaGoldenCorpusReport {
  schemaVersion: 1;
  corpusId: string;
  cases: readonly ArenaGoldenCaseReport[];
  casesWithFailures: number;
  totalAssertionFailures: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseAssertions(
  raw: unknown,
  caseId: string,
): ArenaGoldenAssertions {
  if (!isRecord(raw)) {
    throw new Error(
      "Arena golden case " + caseId + " assertions must be an object.",
    );
  }

  const output: ArenaGoldenAssertions = {};

  if (raw.arenaCount !== undefined) {
    if (
      typeof raw.arenaCount !== "number" ||
      !Number.isInteger(raw.arenaCount) ||
      raw.arenaCount < 1
    ) {
      throw new Error(
        "Arena golden case " + caseId + " arenaCount must be a positive integer.",
      );
    }
    output.arenaCount = raw.arenaCount;
  }

  if (raw.layoutStatus !== undefined) {
    if (
      ![
        "unavailable",
        "script-only",
        "topology-only",
        "consistent",
        "conflict",
      ].includes(String(raw.layoutStatus))
    ) {
      throw new Error(
        "Arena golden case " + caseId + " has invalid layoutStatus.",
      );
    }
    output.layoutStatus =
      raw.layoutStatus as ArenaLayoutReconciliationStatus;
  }

  if (raw.proofConclusion !== undefined) {
    if (
      ![
        "complete-proof",
        "bounded-proof",
        "no-proof",
        "partition-fallback",
      ].includes(String(raw.proofConclusion))
    ) {
      throw new Error(
        "Arena golden case " + caseId + " has invalid proofConclusion.",
      );
    }
    output.proofConclusion =
      raw.proofConclusion as ArenaProofConclusion;
  }

  if (raw.minCoverageRatio !== undefined) {
    if (
      typeof raw.minCoverageRatio !== "number" ||
      raw.minCoverageRatio < 0 ||
      raw.minCoverageRatio > 1
    ) {
      throw new Error(
        "Arena golden case " + caseId + " minCoverageRatio must be between 0 and 1.",
      );
    }
    output.minCoverageRatio = raw.minCoverageRatio;
  }

  if (raw.capacityOk !== undefined) {
    if (typeof raw.capacityOk !== "boolean") {
      throw new Error(
        "Arena golden case " + caseId + " capacityOk must be boolean.",
      );
    }
    output.capacityOk = raw.capacityOk;
  }

  if (raw.requirePackIdentityDrift !== undefined) {
    if (typeof raw.requirePackIdentityDrift !== "boolean") {
      throw new Error(
        "Arena golden case " + caseId + " requirePackIdentityDrift must be boolean.",
      );
    }
    output.requirePackIdentityDrift = raw.requirePackIdentityDrift;
  }

  if (raw.releaseStatus !== undefined) {
    if (
      raw.releaseStatus !== "unavailable" &&
      raw.releaseStatus !== "consistent" &&
      raw.releaseStatus !== "conflict"
    ) {
      throw new Error(
        "Arena golden case " + caseId + " has invalid releaseStatus.",
      );
    }
    output.releaseStatus = raw.releaseStatus;
  }

  if (raw.replicaStatuses !== undefined) {
    if (!isRecord(raw.replicaStatuses)) {
      throw new Error(
        "Arena golden case " + caseId + " replicaStatuses must be an object.",
      );
    }
    const statuses: Record<string, ArenaReplicaProofQualityStatus> = {};
    for (const [arenaId, status] of Object.entries(raw.replicaStatuses)) {
      if (
        ![
          "complete-proof",
          "bounded-proof",
          "diverged",
          "incomplete-proof",
          "budget-exceeded",
          "no-proof",
        ].includes(String(status))
      ) {
        throw new Error(
          "Arena golden case " + caseId + " has invalid replica status for " + arenaId + ".",
        );
      }
      statuses[arenaId] = status as ArenaReplicaProofQualityStatus;
    }
    output.replicaStatuses = statuses;
  }

  const allowed = new Set([
    "arenaCount",
    "layoutStatus",
    "proofConclusion",
    "minCoverageRatio",
    "capacityOk",
    "requirePackIdentityDrift",
    "releaseStatus",
    "replicaStatuses",
  ]);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      throw new Error(
        "Arena golden case " + caseId + " has unsupported assertion: " + key,
      );
    }
  }

  return output;
}

export function parseArenaGoldenManifest(
  input: unknown,
): ArenaGoldenManifest {
  if (!isRecord(input)) {
    throw new Error("Arena golden manifest must be an object.");
  }
  if (input.schemaVersion !== 1) {
    throw new Error("Arena golden manifest schemaVersion must be 1.");
  }
  if (!nonEmptyString(input.id)) {
    throw new Error("Arena golden manifest id must be non-empty.");
  }
  if (!Array.isArray(input.cases)) {
    throw new Error("Arena golden manifest cases must be an array.");
  }

  const ids = new Set<string>();
  const cases = input.cases.map((raw, index): ArenaGoldenCase => {
    if (!isRecord(raw)) {
      throw new Error("Arena golden case " + index + " must be an object.");
    }
    if (!nonEmptyString(raw.id)) {
      throw new Error("Arena golden case " + index + " requires id.");
    }
    if (ids.has(raw.id)) {
      throw new Error("Duplicate arena golden case id: " + raw.id);
    }
    ids.add(raw.id);

    if (!nonEmptyString(raw.label) || !nonEmptyString(raw.artifactFile)) {
      throw new Error(
        "Arena golden case " + raw.id + " requires label and artifactFile.",
      );
    }
    if (
      raw.regionContractsFile !== undefined &&
      !nonEmptyString(raw.regionContractsFile)
    ) {
      throw new Error(
        "Arena golden case " + raw.id + " regionContractsFile must be non-empty.",
      );
    }
    if (raw.note !== undefined && !nonEmptyString(raw.note)) {
      throw new Error(
        "Arena golden case " + raw.id + " note must be non-empty.",
      );
    }

    return {
      id: raw.id,
      label: raw.label,
      artifactFile: raw.artifactFile,
      ...(raw.regionContractsFile === undefined
        ? {}
        : { regionContractsFile: raw.regionContractsFile }),
      assertions: parseAssertions(raw.assertions, raw.id),
      ...(raw.note === undefined ? {} : { note: raw.note }),
    };
  });

  return {
    schemaVersion: 1,
    id: input.id,
    cases,
  };
}

export function observeArenaGolden(
  result: InspectDirectoryResult,
): ArenaGoldenObservation {
  const arenaCount =
    result.arenaAnalysis.spatialLayout !== undefined
      ? 1 + result.arenaAnalysis.spatialLayout.replicas.length
      : result.arenaAnalysis.discovery !== undefined
        ? 1 + result.arenaAnalysis.discovery.replicas.length
        : undefined;

  return {
    ...(arenaCount === undefined ? {} : { arenaCount }),
    ...(result.arenaAnalysis.spatialLayout === undefined
      ? {}
      : { detectionBasis: result.arenaAnalysis.spatialLayout.basis }),
    ...(result.arenaAnalysis.layoutReconciliation === undefined
      ? {}
      : { layoutStatus: result.arenaAnalysis.layoutReconciliation.status }),
    ...(result.arenaAnalysis.proofConclusion === undefined
      ? {}
      : { proofConclusion: result.arenaAnalysis.proofConclusion.conclusion }),
    ...(result.arenaAnalysis.proofCoverage === undefined
      ? {}
      : { coverageRatio: result.arenaAnalysis.proofCoverage.coverageRatio }),
    ...(result.arenaAnalysis.capacity?.report === undefined
      ? {}
      : { capacityOk: result.arenaAnalysis.capacity.report.ok }),
    packIdentityDrift: result.diagnostics.some(
      (finding) => finding.code === "PACK_IDENTITY_DRIFT",
    ),
    releaseStatus: result.releaseIdentity.status,
    replicaStatuses: Object.fromEntries(
      (result.arenaAnalysis.replicaProofQuality ?? []).map((item) => [
        item.arenaId,
        item.status,
      ]),
    ),
  };
}

export function evaluateArenaGoldenAssertions(
  observation: ArenaGoldenObservation,
  assertions: ArenaGoldenAssertions,
): string[] {
  const failures: string[] = [];

  if (
    assertions.arenaCount !== undefined &&
    observation.arenaCount !== assertions.arenaCount
  ) {
    failures.push(
      "arenaCount: expected " +
        assertions.arenaCount +
        ", observed " +
        String(observation.arenaCount),
    );
  }

  if (
    assertions.layoutStatus !== undefined &&
    observation.layoutStatus !== assertions.layoutStatus
  ) {
    failures.push(
      "layoutStatus: expected " +
        assertions.layoutStatus +
        ", observed " +
        String(observation.layoutStatus),
    );
  }

  if (
    assertions.proofConclusion !== undefined &&
    observation.proofConclusion !== assertions.proofConclusion
  ) {
    failures.push(
      "proofConclusion: expected " +
        assertions.proofConclusion +
        ", observed " +
        String(observation.proofConclusion),
    );
  }

  if (
    assertions.minCoverageRatio !== undefined &&
    (
      observation.coverageRatio === undefined ||
      observation.coverageRatio < assertions.minCoverageRatio
    )
  ) {
    failures.push(
      "coverageRatio: expected at least " +
        assertions.minCoverageRatio +
        ", observed " +
        String(observation.coverageRatio),
    );
  }

  if (
    assertions.capacityOk !== undefined &&
    observation.capacityOk !== assertions.capacityOk
  ) {
    failures.push(
      "capacityOk: expected " +
        assertions.capacityOk +
        ", observed " +
        String(observation.capacityOk),
    );
  }

  if (
    assertions.requirePackIdentityDrift !== undefined &&
    observation.packIdentityDrift !== assertions.requirePackIdentityDrift
  ) {
    failures.push(
      "packIdentityDrift: expected " +
        assertions.requirePackIdentityDrift +
        ", observed " +
        observation.packIdentityDrift,
    );
  }

  if (
    assertions.releaseStatus !== undefined &&
    observation.releaseStatus !== assertions.releaseStatus
  ) {
    failures.push(
      "releaseStatus: expected " +
        assertions.releaseStatus +
        ", observed " +
        observation.releaseStatus,
    );
  }

  for (const [arenaId, expected] of Object.entries(
    assertions.replicaStatuses ?? {},
  )) {
    const actual = observation.replicaStatuses[arenaId];
    if (actual !== expected) {
      failures.push(
        "replicaStatuses." +
          arenaId +
          ": expected " +
          expected +
          ", observed " +
          String(actual),
      );
    }
  }

  return failures.sort();
}

export async function runArenaGoldenCorpus(
  manifest: ArenaGoldenManifest,
  artifactRoot: string,
  target: InspectTargetProfile = {},
  knowledgeCatalog?: KnowledgeCatalog,
): Promise<ArenaGoldenCorpusReport> {
  const reports: ArenaGoldenCaseReport[] = [];

  for (const item of manifest.cases) {
    const caseTarget: InspectTargetProfile = {
      ...target,
    };
    if (item.regionContractsFile) {
      caseTarget.arenaRegionContracts =
        await loadArenaRegionContractsFile(
          resolve(artifactRoot, item.regionContractsFile),
        );
    }

    const result = await inspectArtifact(
      resolve(artifactRoot, item.artifactFile),
      caseTarget,
      knowledgeCatalog,
    );
    const observation = observeArenaGolden(result);
    const assertionFailures =
      evaluateArenaGoldenAssertions(
        observation,
        item.assertions,
      );

    reports.push({
      id: item.id,
      label: item.label,
      assertionFailures,
      observation,
      ...(item.note === undefined ? {} : { note: item.note }),
    });
  }

  return {
    schemaVersion: 1,
    corpusId: manifest.id,
    cases: reports,
    casesWithFailures: reports.filter(
      (item) => item.assertionFailures.length > 0,
    ).length,
    totalAssertionFailures: reports.reduce(
      (sum, item) => sum + item.assertionFailures.length,
      0,
    ),
  };
}

export async function runArenaGoldenCorpusFromFile(
  manifestPath: string,
  artifactRoot?: string,
  target: InspectTargetProfile = {},
  knowledgeCatalog?: KnowledgeCatalog,
): Promise<ArenaGoldenCorpusReport> {
  const manifest = parseArenaGoldenManifest(
    JSON.parse(await readFile(manifestPath, "utf8")) as unknown,
  );
  return runArenaGoldenCorpus(
    manifest,
    artifactRoot ?? dirname(resolve(manifestPath)),
    target,
    knowledgeCatalog,
  );
}
