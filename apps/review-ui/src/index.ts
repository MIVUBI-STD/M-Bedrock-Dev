export type ReviewUiPrototypeStatus = {
  readonly phase: "source-prototype";
  readonly runtimeConnected: false;
};

export const reviewUiPrototypeStatus: ReviewUiPrototypeStatus = {
  phase: "source-prototype",
  runtimeConnected: false,
};

export * from "./load-review.js";
export * from "./view-model.js";
