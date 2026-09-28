export type ReviewUiPrototypeStatus = {
  readonly phase: "runtime-prototype";
  readonly runtimeConnected: true;
  readonly filePickerConnected: true;
  readonly recentMapPersistenceConnected: true;
  readonly historyConnected: true;
};

export const reviewUiPrototypeStatus: ReviewUiPrototypeStatus = {
  phase: "runtime-prototype",
  runtimeConnected: true,
  filePickerConnected: true,
  recentMapPersistenceConnected: true,
  historyConnected: true,
};

export * from "./load-review.js";
export * from "./view-model.js";
export * from "./runtime-client.js";
export * from "./runtime-controller.js";
