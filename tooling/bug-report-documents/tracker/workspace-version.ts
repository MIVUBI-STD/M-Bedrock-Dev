import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

interface CurrentBinding {
  readonly projectId: string;
  readonly projectName: string;
  readonly artifact?: { readonly version: string };
  readonly levels?: readonly {
    readonly level: number;
    readonly levelName: string;
    readonly artifact: { readonly version: string };
  }[];
}

async function exists(path: string): Promise<boolean> {
  try { await readFile(path); return true; } catch { return false; }
}

async function validateScope(
  root: string,
  label: string,
  currentVersion: string,
): Promise<string[]> {
  const errors: string[] = [];
  const reportPath = resolve(root, "report", "bug-report.json");
  if (await exists(reportPath)) {
    const report = JSON.parse(await readFile(reportPath, "utf8")) as {
      readonly map?: { readonly mapVersion?: string };
    };
    if (report.map?.mapVersion !== currentVersion) {
      errors.push(label + ": current bug-report version does not match current binding.");
    }
  }

  const archiveRoot = resolve(root, "archive");
  try {
    for (const entry of await readdir(archiveRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!/^v\d+\.\d+\.\d+$/.test(entry.name)) {
        errors.push(label + ": invalid archive version directory " + entry.name + ".");
      }
      if (entry.name === "v" + currentVersion) {
        errors.push(label + ": current version must not be duplicated in archive.");
      }
    }
  } catch {}

  return errors;
}

export async function validateWorkspaceVersions(
  projectsRoot = resolve(process.cwd(), "workspace/projects"),
): Promise<void> {
  const errors: string[] = [];
  for (const entry of await readdir(projectsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const projectPath = resolve(projectsRoot, entry.name, "project.json");
    let project: CurrentBinding;
    try {
      project = JSON.parse(await readFile(projectPath, "utf8")) as CurrentBinding;
    } catch {
      continue;
    }

    if (project.levels?.length) {
      for (const level of project.levels) {
        errors.push(...await validateScope(
          resolve(projectsRoot, entry.name, "levels", "level-" + String(level.level)),
          project.projectName + " / Level " + String(level.level),
          level.artifact.version,
        ));
      }
    } else if (project.artifact) {
      errors.push(...await validateScope(
        resolve(projectsRoot, entry.name),
        project.projectName,
        project.artifact.version,
      ));
    }
  }

  if (errors.length) {
    throw new Error("Workspace version validation failed:\n- " + errors.join("\n- "));
  }
}
