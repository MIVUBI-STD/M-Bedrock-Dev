export interface ProjectWorkspaceLayout {
  root: string;
  source: string;
  design: string;
  working: string;
  output: string;
  evidence: string;
  patches: string;
  state: string;
}

export function projectWorkspaceLayout(
  workspaceRoot: string,
  projectId: string,
): ProjectWorkspaceLayout {
  const root = `${workspaceRoot}/projects/${projectId}`;

  return {
    root,
    source: `${root}/source`,
    design: `${root}/design`,
    working: `${root}/working`,
    output: `${root}/output`,
    evidence: `${root}/evidence`,
    patches: `${root}/patches`,
    state: `${root}/state`,
  };
}
