export const BUG_REPORT_WORKSPACE_DIRECTORY = "workspace/projects" as const;

export function buildBugReportWorkspacePath(projectId: string, levelId?: string): string {
  const valid = (id: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
  if (!valid(projectId) || (levelId !== undefined && !/^level-[1-9][0-9]*$/.test(levelId))) {
    throw new Error("Invalid canonical project or level identity.");
  }
  return BUG_REPORT_WORKSPACE_DIRECTORY + "/" + projectId +
    (levelId === undefined ? "" : "/levels/" + levelId) +
    "/report/bug-report.json";
}
