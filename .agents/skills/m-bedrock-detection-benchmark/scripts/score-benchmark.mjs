import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  throw new Error("Usage: node score-benchmark.mjs <result.json>");
}

const data = JSON.parse(readFileSync(path, "utf8"));
const metrics = data.metrics ?? {};

for (const key of ["tp", "tn", "fp", "fn", "unknown"]) {
  if (!Number.isInteger(metrics[key]) || metrics[key] < 0) {
    throw new Error(`metrics.${key} must be a non-negative integer`);
  }
}

const precision =
  metrics.tp + metrics.fp === 0
    ? null
    : metrics.tp / (metrics.tp + metrics.fp);

const recall =
  metrics.tp + metrics.fn === 0
    ? null
    : metrics.tp / (metrics.tp + metrics.fn);

const specificity =
  metrics.tn + metrics.fp === 0
    ? null
    : metrics.tn / (metrics.tn + metrics.fp);

const falsePositiveRate =
  metrics.fp + metrics.tn === 0
    ? null
    : metrics.fp / (metrics.fp + metrics.tn);

const auditQuality = data.auditQuality ?? undefined;
const totalVisibleFindings =
  auditQuality === undefined
    ? undefined
    : (
        auditQuality.totalVisibleFindings ??
        auditQuality.proven +
          auditQuality.needValidation
      );
const provenRate =
  auditQuality === undefined ||
  totalVisibleFindings === 0
    ? null
    : auditQuality.proven /
      totalVisibleFindings;
const needValidationRate =
  auditQuality === undefined ||
  totalVisibleFindings === 0
    ? null
    : auditQuality.needValidation /
      totalVisibleFindings;
const runtimeResidueRate =
  auditQuality === undefined ||
  totalVisibleFindings === 0
    ? null
    : auditQuality.runtimeResidue /
      totalVisibleFindings;

const output = {
  ...data,
  metrics: {
    ...metrics,
    precision,
    recall,
    specificity,
    falsePositiveRate,
  },
  ...(auditQuality === undefined
    ? {}
    : {
        auditQuality: {
          ...auditQuality,
          totalVisibleFindings,
          provenRate,
          needValidationRate,
          runtimeResidueRate,
        },
      }),
};

process.stdout.write(JSON.stringify(output, null, 2) + "\n");
