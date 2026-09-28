import type { ReviewUiViewModel } from "./view-model.js";

export interface ReviewRuntimeInfo {
  configured: boolean;
  artifactLabel?: string;
}

export interface ReviewRuntimeClient {
  info(): Promise<ReviewRuntimeInfo>;
  analyze(): Promise<ReviewUiViewModel>;
}

async function jsonOrError<T>(response: Response): Promise<T> {
  const body = await response.json() as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new Error(
      body.error ?? "Review runtime request failed.",
    );
  }

  return body;
}

export function createReviewRuntimeClient(
  baseUrl = "/__m-bedrock/review",
): ReviewRuntimeClient {
  return {
    async info() {
      const response = await fetch(baseUrl + "/info");
      return jsonOrError<ReviewRuntimeInfo>(response);
    },
    async analyze() {
      const response = await fetch(baseUrl + "/analyze", {
        method: "POST",
      });
      return jsonOrError<ReviewUiViewModel>(response);
    },
  };
}
