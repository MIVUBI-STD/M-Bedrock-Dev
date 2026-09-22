export interface ProjectWorkspaceLayout {
  root: string;
  source: string;
  working: string;
  output: string;
  reports: string;
  patches: string;
  state: string;
}

export function projectWorkspaceLayout(
  workspaceRoot: string,
  projectId: string,
): ProjectWorkspaceLayout {
  const root = `${workspaceRoot}/active/${projectId}`;

  return {
    root,
    source: `${root}/source`,
    working: `${root}/working`,
    output: `${root}/output`,
    reports: `${root}/reports`,
    patches: `${root}/patches`,
    state: `${root}/state`,
  };
}
