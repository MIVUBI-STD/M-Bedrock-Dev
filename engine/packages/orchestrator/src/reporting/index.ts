/**
 * INTERNAL / ENGINE-DEVELOPMENT BARREL.
 *
 * Production selected-map audits must not enter through this module.
 * Use ../map-audit-pipeline.ts so audit identity, revision, ordered gates,
 * candidate coverage, and report admission cannot be bypassed.
 */
export * from "./report-candidate-reuse.js";
export * from "./report-classification-producers.js";
export * from "./report-confirmation-adapter.js";
export * from "./report-defect-classification.js";
export * from "./report-defect-collector.js";
export * from "./report-repair-context.js";
export * from "./report-runtime-classification.js";
export * from "./report-source-owner.js";
export * from "./static-report-confirmation-adapter.js";
export * from "./tester-report-confirmation-adapter.js";

export * from "./map-audit-finding-reasoning.js";

export * from "./map-audit-finding-reasoning-admission.js";
