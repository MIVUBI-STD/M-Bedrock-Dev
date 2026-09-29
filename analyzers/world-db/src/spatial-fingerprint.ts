import { createHash } from "node:crypto";

export interface SpatialCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface SpatialCellSample extends SpatialCoordinate {
  blockIdentifier: string;
  states?: Readonly<Record<string, string | number | boolean>>;
  layer?: number;
}

export interface SpatialIgnoredVolume {
  min: SpatialCoordinate;
  max: SpatialCoordinate;
}

export interface SpatialFingerprintOptions {
  origin?: SpatialCoordinate;
  bucketSize?: number;
  ignoredVolumes?: readonly SpatialIgnoredVolume[];
}

export interface SpatialBucketFingerprint {
  bucket: string;
  hash: string;
  sampleCount: number;
}

export interface SpatialFingerprint {
  algorithm: "sha256";
  hash: string;
  sampleCount: number;
  ignoredSampleCount: number;
  bucketSize: number;
  buckets: readonly SpatialBucketFingerprint[];
}

export interface SpatialFingerprintComparison {
  equal: boolean;
  referenceHash: string;
  targetHash: string;
  differingBuckets: readonly string[];
}

function inside(
  sample: SpatialCoordinate,
  volume: SpatialIgnoredVolume,
): boolean {
  return (
    sample.x >= Math.min(volume.min.x, volume.max.x) &&
    sample.x <= Math.max(volume.min.x, volume.max.x) &&
    sample.y >= Math.min(volume.min.y, volume.max.y) &&
    sample.y <= Math.max(volume.min.y, volume.max.y) &&
    sample.z >= Math.min(volume.min.z, volume.max.z) &&
    sample.z <= Math.max(volume.min.z, volume.max.z)
  );
}

function stableStates(
  states: SpatialCellSample["states"],
): readonly [string, string | number | boolean][] {
  return Object.entries(states ?? {}).sort(([a], [b]) => a.localeCompare(b));
}

function normalizedSample(
  sample: SpatialCellSample,
  origin: SpatialCoordinate,
) {
  return {
    x: sample.x - origin.x,
    y: sample.y - origin.y,
    z: sample.z - origin.z,
    layer: sample.layer ?? 0,
    blockIdentifier: sample.blockIdentifier,
    states: stableStates(sample.states),
  };
}

function digest(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

export function createSpatialFingerprint(
  samples: readonly SpatialCellSample[],
  options: SpatialFingerprintOptions = {},
): SpatialFingerprint {
  const origin = options.origin ?? { x: 0, y: 0, z: 0 };
  const bucketSize = options.bucketSize ?? 16;
  if (!Number.isInteger(bucketSize) || bucketSize <= 0) {
    throw new Error("Spatial fingerprint bucketSize must be a positive integer.");
  }

  let ignoredSampleCount = 0;
  const normalized = samples
    .filter((sample) => {
      const ignored = (options.ignoredVolumes ?? []).some((volume) =>
        inside(sample, volume)
      );
      if (ignored) ignoredSampleCount += 1;
      return !ignored;
    })
    .map((sample) => normalizedSample(sample, origin))
    .sort((a, b) =>
      a.x - b.x ||
      a.y - b.y ||
      a.z - b.z ||
      a.layer - b.layer ||
      a.blockIdentifier.localeCompare(b.blockIdentifier)
    );

  const buckets = new Map<string, typeof normalized>();
  for (const sample of normalized) {
    const key = [
      Math.floor(sample.x / bucketSize),
      Math.floor(sample.y / bucketSize),
      Math.floor(sample.z / bucketSize),
    ].join(",");
    const bucket = buckets.get(key) ?? [];
    bucket.push(sample);
    buckets.set(key, bucket);
  }

  const bucketFingerprints = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, bucketSamples]) => ({
      bucket,
      hash: digest(bucketSamples),
      sampleCount: bucketSamples.length,
    }));

  return {
    algorithm: "sha256",
    hash: digest(bucketFingerprints),
    sampleCount: normalized.length,
    ignoredSampleCount,
    bucketSize,
    buckets: bucketFingerprints,
  };
}

export function compareSpatialFingerprints(
  reference: SpatialFingerprint,
  target: SpatialFingerprint,
): SpatialFingerprintComparison {
  const referenceBuckets = new Map(
    reference.buckets.map((item) => [item.bucket, item.hash]),
  );
  const targetBuckets = new Map(
    target.buckets.map((item) => [item.bucket, item.hash]),
  );
  const keys = new Set([
    ...referenceBuckets.keys(),
    ...targetBuckets.keys(),
  ]);

  const differingBuckets = [...keys]
    .filter((key) => referenceBuckets.get(key) !== targetBuckets.get(key))
    .sort();

  return {
    equal:
      reference.hash === target.hash &&
      reference.bucketSize === target.bucketSize,
    referenceHash: reference.hash,
    targetHash: target.hash,
    differingBuckets,
  };
}
