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
  behaviorConstraints?: GameDesignBehaviorConstraints;
  invariants: readonly {
    id: string;
    statement: string;
    strength: "must" | "must-not" | "should";
    subjectIds?: readonly string[];
  }[];
}

export interface GameDesignBehaviorConstraints {
  combat?: {
    friendlyFireAllowed?: boolean;
    crossArenaDamageAllowed?: boolean;
    environmentalDamageAllowed?: boolean;
    selfReviveAllowed?: boolean;
    multipleReviversAllowed?: boolean;
    reviveAfterDeathAllowed?: boolean;
  };
  economy?: {
    deathRewardArbitration?: "complementary" | "mutually-exclusive" | "unresolved";
    pickupCurrencyItemPolicy?: "consume" | "retain" | "not-applicable";
    inventoryFullPolicy?: "leave-remainder" | "defer" | "convert" | "reject" | "compensate" | "not-applicable";
  };
  inventory?: {
    rules: readonly {
      id: string;
      itemClass: string;
      ownershipScope: "player-durable" | "session" | "arena" | "round" | "life";
      dropAllowed: boolean;
      resetOn: readonly ("kit-switch" | "round-end" | "arena-end" | "death" | "respawn" | "disconnect" | "reconnect" | "lobby-return")[];
      restoreOn?: readonly ("kit-switch" | "round-end" | "arena-end" | "death" | "respawn" | "disconnect" | "reconnect" | "lobby-return")[];
    }[];
  };
  spatial?: {
    rules: readonly {
      id: string;
      regionId: string;
      actor: "player" | "entity" | "system" | "*";
      action: "place-block" | "break-block" | "interact-block" | "use-item" | "use-container" | "teleport" | "spawn-entity" | "place-structure" | "*";
      phases?: readonly string[];
      decision: "allow" | "deny";
    }[];
  };
}
