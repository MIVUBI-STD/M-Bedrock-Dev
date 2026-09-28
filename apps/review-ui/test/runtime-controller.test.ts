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

function file(name = "map.mcworld"): File {
  return { name } as File;
}

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
          uploadSupported: true,
          artifactLabel: "map.mcworld",
        };
      },
      analyze() {
        return new Promise((resolve) => {
          resolveAnalyze = resolve;
        });
      },
      async analyzeFile() {
        return nextModel;
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

  it("analyzes a selected browser file without exposing a local path", async () => {
    const nextModel = {
      ...model,
      artifact: {
        ...model.artifact,
        id: "art:upload",
      },
    };
    let receivedName = "";

    const client: ReviewRuntimeClient = {
      async info() {
        return {
          configured: false,
          uploadSupported: true,
        };
      },
      async analyze() {
        return model;
      },
      async analyzeFile(selected) {
        receivedName = selected.name;
        return nextModel;
      },
    };

    const controller =
      new ReviewRuntimeController(client, model);
    const state = await controller.analyzeFile(
      file("BlitzBuild.mcworld"),
    );

    expect(receivedName).toBe("BlitzBuild.mcworld");
    expect(state).toMatchObject({
      phase: "ready",
      model: nextModel,
      artifactLabel: "BlitzBuild.mcworld",
    });
  });

  it("keeps the previous review visible when analysis fails", async () => {
    const client: ReviewRuntimeClient = {
      async info() {
        return {
          configured: true,
          uploadSupported: true,
        };
      },
      async analyze() {
        throw new Error("Map could not be read.");
      },
      async analyzeFile() {
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
      async analyzeFile() {
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
