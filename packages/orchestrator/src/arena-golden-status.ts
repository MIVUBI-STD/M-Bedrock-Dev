import {
  access,
  readFile,
} from "node:fs/promises";
import {
  dirname,
  resolve,
} from "node:path";
import {
  parseArenaGoldenManifest,
  type ArenaGoldenManifest,
} from "./arena-golden-corpus.js";

export type ArenaGoldenCaseReadiness =
  | "ready"
  | "unapproved"
  | "missing-artifact"
  | "missing-region-contract";

export interface ArenaGoldenCaseStatus {
  id: string;
  label: string;
  readiness:
    ArenaGoldenCaseReadiness;
  artifactPath: string;
  regionContractsPath?: string;
  approved: boolean;
  reasons: readonly string[];
}

export interface ArenaGoldenCorpusStatus {
  schemaVersion: 1;
  corpusId: string;
  requireApproval: boolean;
  root: string;
  cases:
    readonly ArenaGoldenCaseStatus[];
  ready: number;
  blocked: number;
}

async function exists(
  path: string,
): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function inspectArenaGoldenCorpusStatus(
  manifest: ArenaGoldenManifest,
  root: string,
): Promise<ArenaGoldenCorpusStatus> {
  const cases:
    ArenaGoldenCaseStatus[] = [];

  for (const item of manifest.cases) {
    const artifactPath =
      resolve(root, item.artifactFile);
    const regionContractsPath =
      item.regionContractsFile === undefined
        ? undefined
        : resolve(
            root,
            item.regionContractsFile,
          );
    const artifactPresent =
      await exists(artifactPath);
    const contractPresent =
      regionContractsPath === undefined
        ? true
        : await exists(
            regionContractsPath,
          );
    const approved =
      item.approval?.status ===
      "approved";

    let readiness:
      ArenaGoldenCaseReadiness;
    const reasons: string[] = [];

    if (!artifactPresent) {
      readiness =
        "missing-artifact";
      reasons.push(
        "Artifact file is missing.",
      );
    } else if (!contractPresent) {
      readiness =
        "missing-region-contract";
      reasons.push(
        "Arena region contract file is missing.",
      );
    } else if (
      manifest.requireApproval === true &&
      !approved
    ) {
      readiness = "unapproved";
      reasons.push(
        "Corpus requires explicit case approval before execution.",
      );
    } else {
      readiness = "ready";
      reasons.push(
        "Cheap corpus preflight passed; full inspection has not been executed yet.",
      );
    }

    cases.push({
      id: item.id,
      label: item.label,
      readiness,
      artifactPath,
      ...(regionContractsPath === undefined
        ? {}
        : { regionContractsPath }),
      approved,
      reasons,
    });
  }

  return {
    schemaVersion: 1,
    corpusId: manifest.id,
    requireApproval:
      manifest.requireApproval === true,
    root,
    cases,
    ready:
      cases.filter(
        (item) =>
          item.readiness === "ready",
      ).length,
    blocked:
      cases.filter(
        (item) =>
          item.readiness !== "ready",
      ).length,
  };
}

export async function inspectArenaGoldenCorpusStatusFromFile(
  manifestPath: string,
  artifactRoot?: string,
): Promise<ArenaGoldenCorpusStatus> {
  const resolvedManifest =
    resolve(manifestPath);
  const manifest =
    parseArenaGoldenManifest(
      JSON.parse(
        await readFile(
          resolvedManifest,
          "utf8",
        ),
      ) as unknown,
    );

  return inspectArenaGoldenCorpusStatus(
    manifest,
    artifactRoot ??
      dirname(resolvedManifest),
  );
}
