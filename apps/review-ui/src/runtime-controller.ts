import type {
  ReviewRuntimeClient,
  ReviewRuntimeInfo,
} from "./runtime-client.js";
import type { ReviewUiViewModel } from "./view-model.js";

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
    } catch {
      // Static production preview has no local runtime endpoint.
    }
    return this.stateValue;
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
    return this.execute(
      () => this.client.analyze(),
      this.stateValue.info?.artifactLabel,
    );
  }

  async analyzeFile(
    file: File,
  ): Promise<ReviewRuntimeState> {
    return this.execute(
      () => this.client.analyzeFile(file),
      file.name,
    );
  }
}
