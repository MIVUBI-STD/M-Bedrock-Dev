# Detector Quality Metrics

Detection Development and Detection Benchmark evaluate quality, not raw finding count.

Minimum metrics:

- TP — expected defect correctly detected;
- FP — non-defect incorrectly reported;
- FN — expected defect missed;
- Unknown — correctly/incorrectly unresolved cases tracked separately;
- Precision = TP / (TP + FP);
- Recall = TP / (TP + FN).

Also record when material:

- proof-strength delta;
- minimum evidence tier before/after;
- runtime-cost delta;
- context/token delta;
- new ambiguity introduced;
- severity/disposition drift.

A detector improvement is not automatically accepted when recall rises but precision materially degrades.
