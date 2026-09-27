# Gameplay Understanding Calibration Corpus

This directory stores metadata and normalized calibration baselines only.

It MUST NOT contain proprietary `.mcworld` binaries.

## Purpose

The corpus is used to measure whether M-Bedrock-Dev can reconstruct gameplay meaning across heterogeneous authored worlds without hardcoding map-specific answers.

A corpus case describes:

- an external artifact filename;
- its source-shape category;
- learning dimensions that the artifact exercises.

It does not declare expected node IDs, bug labels, or root causes.

## Run

Place/materialize the external sample worlds in one local directory, then run:

```text
npm run cli -- corpus-calibrate fixtures/calibration/gameplay-understanding-samples.json <artifact-root>
```

The result is a normalized understanding fingerprint per map plus aggregate corpus coverage.

## Baselines

`baselines/` contains normalized reports from known engine revisions. They contain metrics only, not world content.

A change in a baseline is an investigation signal, not semantic truth. In particular:

- more nodes is not automatically better;
- fewer nodes is not automatically worse;
- a lost authored concept, new unknown blocker, or lost spatial route profile deserves review;
- intentional semantic corrections may legitimately change the fingerprint.

Calibration must never become map-name hardcoding.
