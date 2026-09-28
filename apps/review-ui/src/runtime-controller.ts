import type {
  ReviewHistoryEvent,
  ReviewRecentArtifact,
  ReviewRuntimeClient,
  ReviewRuntimeInfo,
} from "./runtime-client.js";
import type { ReviewUiViewModel } from "./view-model.js";

type ReviewArtifactSource =
  | {
      kind: "configured";
      label?: string;
    }
  | {
      kind: "recent";
      id: string;
      label: string;
    };

export type ReviewRuntimeState =
  | {
      phase: "idle";
      info?: ReviewRuntimeInfo;
      model?: ReviewUiViewModel;
    }
  | {
      phase: "loading";
      info?: ReviewRuntimeInfo;
      model?: ReviewUiViewModel;
      loadingLabel?: string;
    }
  | {
      phase: "ready";
      info?: ReviewRuntimeInfo;
      model: ReviewUiViewModel;
      artifactLabel?: string;
    }
  | {
      phase: "error";
      info?: ReviewRuntimeInfo;
      model?: ReviewUiViewModel;
      message: string;
      artifactLabel?: string;
    };

export class ReviewRuntimeController {
  private stateValue: ReviewRuntimeState = {
    phase: "idle",
  };
  private currentSource:
    ReviewArtifactSource | undefined;

  constructor(
    private readonly client: ReviewRuntimeClient,
    initialModel?: ReviewUiViewModel,
  ) {
    if (initialModel) {
      this.stateValue = {
        phase: "idle",
        model: initialModel,
      };
    }
  }

  state(): ReviewRuntimeState {
    return this.stateValue;
  }

  async discover(): Promise<ReviewRuntimeState> {
    try {
      const info = await this.client.info();
      this.stateValue = {
        ...this.stateValue,
        info,
      };
      if (info.configured && !this.currentSource) {
        this.currentSource = {
          kind: "configured",
          ...(info.artifactLabel === undefined
            ? {}
            : { label: info.artifactLabel }),
        };
      }
    } catch {
      // Static production preview has no local runtime endpoint.
    }
    return this.stateValue;
  }

  async recent(): Promise<
    readonly ReviewRecentArtifact[]
  > {
    return this.client.recent();
  }

  async history(
    artifactId: string,
  ): Promise<readonly ReviewHistoryEvent[]> {
    return this.client.history(artifactId);
  }

  private async execute(
    load: () => Promise<ReviewUiViewModel>,
    artifactLabel?: string,
  ): Promise<ReviewRuntimeState> {
    const previous = this.stateValue.model;
    const info = this.stateValue.info;

    this.stateValue = {
      phase: "loading",
      ...(info === undefined ? {} : { info }),
      ...(previous === undefined ? {} : { model: previous }),
      ...(artifactLabel === undefined
        ? {}
        : { loadingLabel: artifactLabel }),
    };

    try {
      const model = await load();
      this.stateValue = {
        phase: "ready",
        ...(info === undefined ? {} : { info }),
        model,
        ...(artifactLabel === undefined
          ? {}
          : { artifactLabel }),
      };
    } catch (error) {
      this.stateValue = {
        phase: "error",
        ...(info === undefined ? {} : { info }),
        ...(previous === undefined ? {} : { model: previous }),
        ...(artifactLabel === undefined
          ? {}
          : { artifactLabel }),
        message:
          error instanceof Error && error.message.trim()
            ? error.message.trim()
            : "Analysis could not finish.",
      };
    }

    return this.stateValue;
  }

  async analyze(): Promise<ReviewRuntimeState> {
    if (this.currentSource?.kind === "recent") {
      const source = this.currentSource;
      return this.execute(
        async () => {
          const result =
            await this.client.analyzeRecent(
              source.id,
              "reanalysis",
            );
          this.currentSource = {
            kind: "recent",
            id: result.record.id,
            label: result.record.label,
          };
          return result.model;
        },
        source.label,
      );
    }

    return this.execute(
      () => this.client.analyzeConfigured(),
      this.currentSource?.label ??
        this.stateValue.info?.artifactLabel,
    );
  }

  async analyzeFile(
    file: File,
  ): Promise<ReviewRuntimeState> {
    return this.execute(
      async () => {
        const result =
          await this.client.analyzeFile(file);
        this.currentSource = {
          kind: "recent",
          id: result.record.id,
          label: result.record.label,
        };
        return result.model;
      },
      file.name,
    );
  }

  async analyzeRecent(
    recent: Pick<ReviewRecentArtifact, "id" | "label">,
  ): Promise<ReviewRuntimeState> {
    return this.execute(
      async () => {
        const result =
          await this.client.analyzeRecent(
            recent.id,
            "recent-open",
          );
        this.currentSource = {
          kind: "recent",
          id: result.record.id,
          label: result.record.label,
        };
        return result.model;
      },
      recent.label,
    );
  }
}
