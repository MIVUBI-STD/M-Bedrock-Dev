import { describe, expect, it } from "vitest";
import {
  ReviewRuntimeController,
} from "../src/runtime-controller.js";
import type {
  ReviewAnalysisEnvelope,
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

function envelope(
  nextModel: ReviewUiViewModel,
  label = "map.mcworld",
): ReviewAnalysisEnvelope {
  return {
    model: nextModel,
    record: {
      id: nextModel.artifact.id,
      label,
      targetLabel: nextModel.artifact.targetLabel,
      attentionCount: nextModel.attentionCount,
      updatedAt: "2026-09-28T00:00:00.000Z",
    },
  };
}

function file(name = "map.mcworld"): File {
  return { name } as File;
}

describe("review runtime controller", () => {
  it("preserves the previous review while configured re-analysis is running and replaces it on success", async () => {
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
      async recent() {
        return [];
      },
      analyzeConfigured() {
        return new Promise((resolve) => {
          resolveAnalyze = resolve;
        });
      },
      async analyzeFile() {
        return envelope(nextModel);
      },
      async analyzeRecent() {
        return envelope(nextModel);
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

  it("re-analyzes the currently opened uploaded map instead of the configured artifact", async () => {
    const uploaded = {
      ...model,
      artifact: {
        ...model.artifact,
        id: "art:upload",
      },
    };
    let configuredCalls = 0;
    let recentCalls = 0;
    let recentTrigger = "";

    const client: ReviewRuntimeClient = {
      async info() {
        return {
          configured: true,
          uploadSupported: true,
          artifactLabel: "default.mcworld",
        };
      },
      async recent() {
        return [];
      },
      async analyzeConfigured() {
        configuredCalls += 1;
        return model;
      },
      async analyzeFile() {
        return envelope(
          uploaded,
          "Uploaded.mcworld",
        );
      },
      async analyzeRecent(_id, trigger) {
        recentCalls += 1;
        recentTrigger = trigger ?? "";
        return envelope(
          uploaded,
          "Uploaded.mcworld",
        );
      },
    };

    const controller =
      new ReviewRuntimeController(client, model);
    await controller.discover();
    await controller.analyzeFile(
      file("Uploaded.mcworld"),
    );
    await controller.analyze();

    expect(configuredCalls).toBe(0);
    expect(recentCalls).toBe(1);
    expect(recentTrigger).toBe("reanalysis");
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
      async recent() {
        return [];
      },
      async analyzeConfigured() {
        return model;
      },
      async analyzeFile(selected) {
        receivedName = selected.name;
        return envelope(
          nextModel,
          selected.name,
        );
      },
      async analyzeRecent() {
        return envelope(nextModel);
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

  it("reopens a managed recent artifact by id", async () => {
    let recentId = "";
    let trigger = "";
    const nextModel = {
      ...model,
      artifact: {
        ...model.artifact,
        id: "art:recent",
      },
    };
    const client: ReviewRuntimeClient = {
      async info() {
        return {
          configured: false,
          uploadSupported: true,
        };
      },
      async recent() {
        return [];
      },
      async analyzeConfigured() {
        return model;
      },
      async analyzeFile() {
        return envelope(nextModel);
      },
      async analyzeRecent(id, nextTrigger) {
        recentId = id;
        trigger = nextTrigger ?? "";
        return envelope(
          nextModel,
          "Recent.mcworld",
        );
      },
    };

    const controller =
      new ReviewRuntimeController(client, model);
    const state = await controller.analyzeRecent({
      id: "art:recent",
      label: "Recent.mcworld",
    });

    expect(recentId).toBe("art:recent");
    expect(trigger).toBe("recent-open");
    expect(state).toMatchObject({
      phase: "ready",
      artifactLabel: "Recent.mcworld",
      model: nextModel,
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
      async recent() {
        return [];
      },
      async analyzeConfigured() {
        throw new Error("Map could not be read.");
      },
      async analyzeFile() {
        throw new Error("Map could not be read.");
      },
      async analyzeRecent() {
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
      async recent() {
        throw new Error("not available");
      },
      async analyzeConfigured() {
        return model;
      },
      async analyzeFile() {
        return envelope(model);
      },
      async analyzeRecent() {
        return envelope(model);
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
