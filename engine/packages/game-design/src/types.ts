export type GameDesignStatus = "draft" | "approved";
export type GameDesignSourceKind = "authored-spec" | "client-brief" | "approved-reconstruction";

export interface GameDesignSpec {
  schemaVersion: 1;
  id: string;
  title?: string;
  status: GameDesignStatus;
  scope?: { mapId?: string; modeId?: string };
  source: { kind: GameDesignSourceKind; reference: string };
  mechanics: readonly { id: string; statement: string; tags?: readonly string[] }[];
  invariants: readonly {
    id: string;
    statement: string;
    strength: "must" | "must-not" | "should";
    subjectIds?: readonly string[];
  }[];
}
