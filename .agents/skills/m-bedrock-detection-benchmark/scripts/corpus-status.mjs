import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifests = [
  "engine/reliability/corpus/calibration.json",
  "engine/reliability/corpus/acceptance.json",
  "engine/reliability/corpus/regressions.json",
];

const summary = {
  schemaVersion: 1,
  manifests: [],
  totals: {
    cases: 0,
    ready: 0,
    candidate: 0,
    blocked: 0,
    positiveEvidence: 0,
    negativeEvidence: 0,
    unspecifiedEvidence: 0,
  },
};

for (const path of manifests) {
  const data = JSON.parse(readFileSync(resolve(path), "utf8"));
  const cases = Array.isArray(data.cases) ? data.cases : [];
  const rows = cases.map((item) => {
    const readiness = item.readiness ?? {};
    const missing = Object.entries(readiness)
      .filter(([, value]) => value === "missing")
      .map(([key]) => key);

    const status =
      item.status === "ready" && missing.length === 0
        ? "ready"
        : item.status === "blocked"
          ? "blocked"
          : "candidate";

    summary.totals.cases += 1;
    summary.totals[status] += 1;

    const evidenceRole =
      item.evidenceRole === "negative"
        ? "negative"
        : item.evidenceRole === "positive"
          ? "positive"
          : "unspecified";

    if (evidenceRole === "negative") {
      summary.totals.negativeEvidence += 1;
    } else if (evidenceRole === "positive") {
      summary.totals.positiveEvidence += 1;
    } else {
      summary.totals.unspecifiedEvidence += 1;
    }

    return {
      id: item.id,
      status,
      missing,
      sourceRef: item.sourceRef ?? null,
      evidenceRole,
    };
  });

  summary.manifests.push({
    id: data.id,
    lane: data.lane,
    cases: rows,
  });
}

process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
