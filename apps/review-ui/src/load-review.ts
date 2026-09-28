import { resolve } from "node:path";
import {
  buildEngineeringReviewProjection,
  inspectArtifact,
  loadRuntimeProbeTranscript,
  loadTelemetryFile,
  type InspectTargetProfile,
} from "../../../packages/orchestrator/src/index.js";
import {
  loadKnowledgeDirectory,
} from "../../../packages/knowledge/src/index.js";
import {
  buildReviewUiViewModel,
  type ReviewUiViewModel,
} from "./view-model.js";

export interface ReviewUiLoadRequest {
  artifactPath: string;
  target?: InspectTargetProfile;
  knowledgeRoot?: string;
  telemetryPath?: string;
  probeTranscriptPath?: string;
}

export async function loadReviewUiViewModel(
  request: ReviewUiLoadRequest,
): Promise<ReviewUiViewModel> {
  const artifactPath = resolve(request.artifactPath);
  const knowledgeRoot = resolve(
    request.knowledgeRoot ?? "knowledge",
  );
  const knowledge = await loadKnowledgeDirectory(
    knowledgeRoot,
  );
  const telemetry = request.telemetryPath === undefined
    ? []
    : await loadTelemetryFile(
        resolve(request.telemetryPath),
      );
  const probeTranscript =
    request.probeTranscriptPath === undefined
      ? undefined
      : await loadRuntimeProbeTranscript(
          resolve(request.probeTranscriptPath),
        );

  const inspection = await inspectArtifact(
    artifactPath,
    request.target ?? {},
    knowledge,
    telemetry,
    probeTranscript,
  );
  const review =
    buildEngineeringReviewProjection(inspection);

  return buildReviewUiViewModel(review);
}
