import type { ArtifactFinding } from "../../artifact/src/index.js";
import { validateArchivePath } from "./path-safety.js";
import type {
  ArchiveEntryDescriptor,
  ArchiveInventory,
  ExtractionBudget,
} from "./types.js";

export interface InventoryValidationResult {
  inventory?: ArchiveInventory;
  findings: ArtifactFinding[];
}

export function validateArchiveInventory(
  entries: readonly ArchiveEntryDescriptor[],
  budget: ExtractionBudget,
): InventoryValidationResult {
  const findings: ArtifactFinding[] = [];
  const normalizedPaths = new Set<string>();
  const caseFoldedPaths = new Map<string, string>();
  let fileCount = 0;
  let expandedBytes = 0;

  if (entries.length > budget.maxFiles) {
    findings.push({
      code: "ARCHIVE_LIMIT_EXCEEDED",
      severity: "fatal",
      message: `Archive entry count exceeds limit ${budget.maxFiles}.`,
    });
  }

  for (const entry of entries) {
    const pathCheck = validateArchivePath(entry.path, budget.maxPathDepth);

    if (!pathCheck.ok || !pathCheck.normalized) {
      findings.push({
        code:
          pathCheck.rejection === "absolute"
            ? "ARCHIVE_ABSOLUTE_PATH"
            : pathCheck.rejection === "traversal"
              ? "ARCHIVE_PATH_TRAVERSAL"
              : pathCheck.rejection === "reserved"
                ? "ARCHIVE_RESERVED_PATH"
                : "ARCHIVE_LIMIT_EXCEEDED",
        severity: "fatal",
        message: `Unsafe archive path: ${entry.path}`,
        path: entry.path,
      });
      continue;
    }

    const normalized = pathCheck.normalized;
    const folded = normalized.toLocaleLowerCase("en-US");

    if (normalizedPaths.has(normalized)) {
      findings.push({
        code: "ARCHIVE_DUPLICATE_PATH",
        severity: "fatal",
        message: `Duplicate archive path: ${normalized}`,
        path: normalized,
      });
    }

    const existingCase = caseFoldedPaths.get(folded);
    if (existingCase && existingCase !== normalized) {
      findings.push({
        code: "ARCHIVE_CASE_COLLISION",
        severity: "fatal",
        message: `Case-colliding archive paths: ${existingCase} and ${normalized}`,
        path: normalized,
      });
    }

    normalizedPaths.add(normalized);
    caseFoldedPaths.set(folded, normalized);

    if (!entry.isDirectory) fileCount += 1;
    expandedBytes += entry.expandedBytes;

    if (entry.expandedBytes > budget.maxSingleFileBytes) {
      findings.push({
        code: "ARCHIVE_LIMIT_EXCEEDED",
        severity: "fatal",
        message: `Archive entry exceeds single-file expansion limit: ${normalized}`,
        path: normalized,
      });
    }

    if (entry.compressedBytes > 0) {
      const ratio = entry.expandedBytes / entry.compressedBytes;
      if (ratio > budget.maxCompressionRatio) {
        findings.push({
          code: "ARCHIVE_LIMIT_EXCEEDED",
          severity: "fatal",
          message: `Archive entry compression ratio exceeds limit: ${normalized}`,
          path: normalized,
        });
      }
    }
  }

  if (fileCount > budget.maxFiles || expandedBytes > budget.maxExpandedBytes) {
    findings.push({
      code: "ARCHIVE_LIMIT_EXCEEDED",
      severity: "fatal",
      message: "Archive expansion budget exceeded.",
    });
  }

  if (findings.some((finding) => finding.severity === "fatal")) {
    return { findings };
  }

  return {
    inventory: {
      entries: [...entries],
      fileCount,
      expandedBytes,
    },
    findings,
  };
}
