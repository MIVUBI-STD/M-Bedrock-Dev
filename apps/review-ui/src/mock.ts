export const mockMap = {
  name: "Blitz Build",
  version: "v1.0.2",
};

export const mockHistory = [
  { time: "22:41", title: "Analysis completed", detail: "5 items need attention" },
  { time: "22:22", title: "Validation run", detail: "8 passed · 1 outdated" },
  { time: "21:58", title: "Repair applied", detail: "Arena cleanup ordering" },
] as const;

export const mockRecentMaps = [
  {
    id: "blitz-build",
    name: "Blitz Build",
    subtitle: "Bedrock · 1.26.32",
    updated: "Updated 12 min ago",
    state: "5 need attention",
    tone: "attention",
  },
  {
    id: "defense-v2",
    name: "Defense V2",
    subtitle: "Bedrock · 1.26.32",
    updated: "Updated yesterday",
    state: "Runtime proof required",
    tone: "warning",
  },
  {
    id: "beach-bedwars",
    name: "Beach Bedwars",
    subtitle: "Bedrock · 1.26.32",
    updated: "Updated 2 days ago",
    state: "Verified",
    tone: "verified",
  },
] as const;
