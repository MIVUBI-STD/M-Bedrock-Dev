import type { ReviewUiViewModel } from "./view-model.js";

export interface ReviewRuntimeInfo {
  configured: boolean;
  uploadSupported: boolean;
  artifactLabel?: string;
}

export interface ReviewRecentArtifact {
  id: string;
  label: string;
  targetLabel: string;
  attentionCount: number;
  updatedAt: string;
  available: boolean;
}

interface ReviewAnalysisEnvelope {
  model: ReviewUiViewModel;
  record: Omit<ReviewRecentArtifact, "available">;
}

export interface ReviewRuntimeClient {
  info(): Promise<ReviewRuntimeInfo>;
  recent(): Promise<readonly ReviewRecentArtifact[]>;
  analyze(): Promise<ReviewUiViewModel>;
  analyzeFile(file: File): Promise<ReviewUiViewModel>;
  analyzeRecent(id: string): Promise<ReviewUiViewModel>;
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
    async recent() {
      const response = await fetch(baseUrl + "/recent");
      const result = await jsonOrError<{
        items: readonly ReviewRecentArtifact[];
      }>(response);
      return result.items;
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
      const result =
        await jsonOrError<ReviewAnalysisEnvelope>(
          response,
        );
      return result.model;
    },
    async analyzeRecent(id) {
      const response = await fetch(
        baseUrl + "/recent-analyze",
        {
          method: "POST",
          headers: {
            "X-M-Bedrock-Recent-Id":
              encodeURIComponent(id),
          },
        },
      );
      const result =
        await jsonOrError<ReviewAnalysisEnvelope>(
          response,
        );
      return result.model;
    },
  };
}
