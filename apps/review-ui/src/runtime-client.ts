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

export interface ReviewAnalysisEnvelope {
  model: ReviewUiViewModel;
  record: Omit<ReviewRecentArtifact, "available">;
}

export interface ReviewHistoryEvent {
  id: string;
  artifactId: string;
  kind: "analysis-completed";
  trigger:
    | "file-open"
    | "recent-open"
    | "reanalysis"
    | "configured-artifact";
  occurredAt: string;
  attentionCount: number;
  targetLabel: string;
}

export type ReviewRecentAnalysisTrigger =
  | "recent-open"
  | "reanalysis";

export interface ReviewRuntimeClient {
  info(): Promise<ReviewRuntimeInfo>;
  recent(): Promise<readonly ReviewRecentArtifact[]>;
  history(artifactId: string): Promise<readonly ReviewHistoryEvent[]>;
  analyzeConfigured(): Promise<ReviewUiViewModel>;
  analyzeFile(file: File): Promise<ReviewAnalysisEnvelope>;
  analyzeRecent(
    id: string,
    trigger?: ReviewRecentAnalysisTrigger,
  ): Promise<ReviewAnalysisEnvelope>;
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
    async history(artifactId) {
      const response = await fetch(baseUrl + "/history", {
        headers: {
          "X-M-Bedrock-Artifact-Id":
            encodeURIComponent(artifactId),
        },
      });
      const result = await jsonOrError<{
        events: readonly ReviewHistoryEvent[];
      }>(response);
      return result.events;
    },
    async analyzeConfigured() {
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
      return jsonOrError<ReviewAnalysisEnvelope>(
        response,
      );
    },
    async analyzeRecent(id, trigger = "recent-open") {
      const response = await fetch(
        baseUrl + "/recent-analyze",
        {
          method: "POST",
          headers: {
            "X-M-Bedrock-Recent-Id":
              encodeURIComponent(id),
            "X-M-Bedrock-Analysis-Trigger": trigger,
          },
        },
      );
      return jsonOrError<ReviewAnalysisEnvelope>(
        response,
      );
    },
  };
}
