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

const output = {
  ...data,
  metrics: {
    ...metrics,
    precision,
    recall,
    specificity,
    falsePositiveRate,
  },
};

process.stdout.write(JSON.stringify(output, null, 2) + "\n");
