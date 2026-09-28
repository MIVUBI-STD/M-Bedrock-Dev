import type { ReviewUiViewModel } from "./view-model.js";

export interface ReviewRuntimeInfo {
  configured: boolean;
  uploadSupported: boolean;
  artifactLabel?: string;
}

export interface ReviewRuntimeClient {
  info(): Promise<ReviewRuntimeInfo>;
  analyze(): Promise<ReviewUiViewModel>;
  analyzeFile(file: File): Promise<ReviewUiViewModel>;
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
    async analyzeFile(file) {
      const response = await fetch(
        baseUrl + "/upload-analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "X-M-Bedrock-Filename":
              encodeURIComponent(file.name),
          },
          body: file,
        },
      );
      return jsonOrError<ReviewUiViewModel>(response);
    },
  };
}
