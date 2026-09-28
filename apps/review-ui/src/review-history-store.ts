import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import {
  join,
  resolve,
} from "node:path";

export type ReviewHistoryTrigger =
  | "file-open"
  | "recent-open"
  | "reanalysis"
  | "configured-artifact";

export interface ReviewHistoryEvent {
  id: string;
  artifactId: string;
  kind: "analysis-completed";
  trigger: ReviewHistoryTrigger;
  occurredAt: string;
  attentionCount: number;
  targetLabel: string;
}

interface ReviewHistoryIndex {
  schemaVersion: 1;
  events: ReviewHistoryEvent[];
}

const EMPTY_INDEX: ReviewHistoryIndex = {
  schemaVersion: 1,
  events: [],
};

export class ReviewHistoryStore {
  private readonly root: string;
  private readonly indexPath: string;

  constructor(
    root = resolve(".cache/review-ui/history"),
    private readonly maxEventsPerArtifact = 40,
    private readonly maxEventsTotal = 240,
  ) {
    this.root = root;
    this.indexPath = join(root, "index.json");
  }

  private async readIndex(): Promise<ReviewHistoryIndex> {
    try {
      const parsed = JSON.parse(
        await readFile(this.indexPath, "utf8"),
      ) as Partial<ReviewHistoryIndex>;
      if (
        parsed.schemaVersion !== 1 ||
        !Array.isArray(parsed.events)
      ) {
        return EMPTY_INDEX;
      }
      return {
        schemaVersion: 1,
        events: parsed.events,
      };
    } catch {
      return EMPTY_INDEX;
    }
  }

  private async writeIndex(
    index: ReviewHistoryIndex,
  ): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await writeFile(
      this.indexPath,
      JSON.stringify(index, null, 2) + "\n",
      "utf8",
    );
  }

  async list(
    artifactId: string,
  ): Promise<readonly ReviewHistoryEvent[]> {
    const index = await this.readIndex();
    return index.events
      .filter((event) => event.artifactId === artifactId)
      .sort((left, right) =>
        right.occurredAt.localeCompare(left.occurredAt)
      )
      .slice(0, this.maxEventsPerArtifact);
  }

  async recordAnalysis(input: {
    artifactId: string;
    trigger: ReviewHistoryTrigger;
    attentionCount: number;
    targetLabel: string;
  }): Promise<ReviewHistoryEvent> {
    const event: ReviewHistoryEvent = {
      id: randomUUID(),
      artifactId: input.artifactId,
      kind: "analysis-completed",
      trigger: input.trigger,
      occurredAt: new Date().toISOString(),
      attentionCount: input.attentionCount,
      targetLabel: input.targetLabel,
    };

    const index = await this.readIndex();
    const sameArtifact = [
      event,
      ...index.events.filter(
        (item) => item.artifactId === input.artifactId,
      ),
    ].slice(0, this.maxEventsPerArtifact);
    const otherArtifacts = index.events.filter(
      (item) => item.artifactId !== input.artifactId,
    );

    await this.writeIndex({
      schemaVersion: 1,
      events: [
        ...sameArtifact,
        ...otherArtifacts,
      ]
        .sort((left, right) =>
          right.occurredAt.localeCompare(left.occurredAt)
        )
        .slice(0, this.maxEventsTotal),
    });

    return event;
  }
}
