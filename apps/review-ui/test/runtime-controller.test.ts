import { describe, expect, it } from "vitest";
import {
  ReviewRuntimeController,
} from "../src/runtime-controller.js";
import type {
  ReviewRuntimeClient,
} from "../src/runtime-client.js";
import type {
  ReviewUiViewModel,
} from "../src/view-model.js";

const model: ReviewUiViewModel = {
  artifact: {
    id: "art:demo",
    targetLabel: "Bedrock · 1.26.32",
  },
  attentionCount: 1,
  items: [],
};

describe("review runtime controller", () => {
  it("preserves the previous review while re-analysis is running and replaces it on success", async () => {
    let resolveAnalyze:
      ((value: ReviewUiViewModel) => void) | undefined;
    const nextModel = {
      ...model,
      artifact: {
        ...model.artifact,
        id: "art:new",
      },
    };

    const client: ReviewRuntimeClient = {
      async info() {
        return {
          configured: true,
          artifactLabel: "map.mcworld",
        };
      },
      analyze() {
        return new Promise((resolve) => {
          resolveAnalyze = resolve;
        });
      },
    };

    const controller =
      new ReviewRuntimeController(client, model);
    await controller.discover();

    const pending = controller.analyze();
    expect(controller.state()).toMatchObject({
      phase: "loading",
      model,
    });

    resolveAnalyze?.(nextModel);
    await pending;

    expect(controller.state()).toMatchObject({
      phase: "ready",
      model: nextModel,
    });
  });

  it("keeps the previous review visible when analysis fails", async () => {
    const client: ReviewRuntimeClient = {
      async info() {
        return { configured: true };
      },
      async analyze() {
        throw new Error("Map could not be read.");
      },
    };

    const controller =
      new ReviewRuntimeController(client, model);
    const state = await controller.analyze();

    expect(state).toMatchObject({
      phase: "error",
      model,
      message: "Map could not be read.",
    });
  });

  it("tolerates a missing dev runtime endpoint for static builds", async () => {
    const client: ReviewRuntimeClient = {
      async info() {
        throw new Error("not available");
      },
      async analyze() {
        return model;
      },
    };

    const controller =
      new ReviewRuntimeController(client, model);
    const state = await controller.discover();

    expect(state).toMatchObject({
      phase: "idle",
      model,
    });
  });
});
