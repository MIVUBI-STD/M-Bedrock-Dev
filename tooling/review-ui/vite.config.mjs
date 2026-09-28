import {
  createWriteStream,
} from "node:fs";
import {
  mkdtemp,
  rm,
} from "node:fs/promises";
import {
  basename,
  extname,
  join,
} from "node:path";
import {
  tmpdir,
} from "node:os";
import {
  Transform,
} from "node:stream";
import {
  pipeline,
} from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import {
  loadReviewUiViewModel,
} from "../../apps/review-ui/src/load-review.ts";
import {
  RecentArtifactStore,
} from "../../apps/review-ui/src/recent-artifact-store.ts";
import {
  ReviewHistoryStore,
} from "../../apps/review-ui/src/review-history-store.ts";

const appRoot = fileURLToPath(
  new URL("../../apps/review-ui/", import.meta.url),
);
const outDir = fileURLToPath(
  new URL("../../dist/review-ui/", import.meta.url),
);
const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;

function sendJson(res, statusCode, value) {
  res.statusCode = statusCode;
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8",
  );
  res.end(JSON.stringify(value));
}

function targetFromEnvironment() {
  const edition =
    process.env.M_BEDROCK_REVIEW_EDITION?.trim();
  const version =
    process.env.M_BEDROCK_REVIEW_VERSION?.trim();

  return {
    ...(edition === "bedrock" ||
    edition === "education"
      ? { edition }
      : {}),
    ...(version ? { version } : {}),
  };
}

function safeUploadName(header) {
  if (typeof header !== "string" || !header.trim()) {
    throw new Error("Uploaded map filename is missing.");
  }

  let decoded;
  try {
    decoded = decodeURIComponent(header);
  } catch {
    throw new Error("Uploaded map filename is invalid.");
  }

  const name = basename(decoded);
  const extension = extname(name).toLowerCase();
  if (extension !== ".mcworld" && extension !== ".zip") {
    throw new Error(
      "Open a .mcworld or .zip Minecraft world.",
    );
  }

  return {
    name,
    extension,
  };
}

async function receiveArtifact(req, path) {
  let bytes = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > MAX_UPLOAD_BYTES) {
        callback(
          new Error(
            "Map exceeds the 1 GB local upload limit.",
          ),
        );
        return;
      }
      callback(null, chunk);
    },
  });

  await pipeline(
    req,
    limiter,
    createWriteStream(path, {
      flags: "wx",
    }),
  );

  if (bytes === 0) {
    throw new Error("Uploaded map is empty.");
  }
}

function reviewRuntimePlugin() {
  const recentStore = new RecentArtifactStore();
  const historyStore = new ReviewHistoryStore();
  const artifactPath =
    process.env.M_BEDROCK_REVIEW_ARTIFACT?.trim();

  return {
    name: "m-bedrock-review-runtime",
    configureServer(server) {
      server.middlewares.use(
        "/__m-bedrock/review",
        async (req, res, next) => {
          const path = req.url?.split("?")[0];

          if (req.method === "GET" && path === "/history") {
            const artifactId =
              typeof req.headers["x-m-bedrock-artifact-id"] === "string"
                ? decodeURIComponent(req.headers["x-m-bedrock-artifact-id"])
                : "";
            if (!artifactId) {
              sendJson(res, 400, {
                error: "Artifact id is missing.",
              });
              return;
            }
            sendJson(res, 200, {
              events: await historyStore.list(artifactId),
            });
            return;
          }

          if (req.method === "GET" && path === "/recent") {
            sendJson(res, 200, {
              items: await recentStore.list(),
            });
            return;
          }

          if (
            req.method === "POST" &&
            path === "/recent-analyze"
          ) {
            const recentId =
              typeof req.headers["x-m-bedrock-recent-id"] === "string"
                ? decodeURIComponent(req.headers["x-m-bedrock-recent-id"])
                : "";
            if (!recentId) {
              sendJson(res, 400, {
                error: "Recent map id is missing.",
              });
              return;
            }

            try {
              const recent =
                await recentStore.resolveArtifact(recentId);
              const model =
                await loadReviewUiViewModel({
                  artifactPath: recent.artifactPath,
                  target: targetFromEnvironment(),
                });
              const triggerHeader =
                req.headers["x-m-bedrock-analysis-trigger"];
              const trigger =
                triggerHeader === "reanalysis"
                  ? "reanalysis"
                  : "recent-open";
              await historyStore.recordAnalysis({
                artifactId: model.artifact.id,
                trigger,
                attentionCount: model.attentionCount,
                targetLabel: model.artifact.targetLabel,
              });
              sendJson(res, 200, {
                model,
                record: recent.record,
              });
            } catch (error) {
              sendJson(res, 404, {
                error:
                  error instanceof Error &&
                  error.message.trim()
                    ? error.message.trim()
                    : "Recent map could not be opened.",
              });
            }
            return;
          }

          if (req.method === "GET" && path === "/info") {
            sendJson(res, 200, {
              configured: Boolean(artifactPath),
              uploadSupported: true,
              ...(artifactPath
                ? { artifactLabel: basename(artifactPath) }
                : {}),
            });
            return;
          }

          if (
            req.method === "POST" &&
            path === "/analyze"
          ) {
            if (!artifactPath) {
              sendJson(res, 409, {
                error:
                  "No development artifact is configured. Open a map from the library or set M_BEDROCK_REVIEW_ARTIFACT.",
              });
              return;
            }

            try {
              const model =
                await loadReviewUiViewModel({
                  artifactPath,
                  target: targetFromEnvironment(),
                });
              await historyStore.recordAnalysis({
                artifactId: model.artifact.id,
                trigger: "configured-artifact",
                attentionCount: model.attentionCount,
                targetLabel: model.artifact.targetLabel,
              });
              sendJson(res, 200, model);
            } catch (error) {
              sendJson(res, 500, {
                error:
                  error instanceof Error &&
                  error.message.trim()
                    ? error.message.trim()
                    : "Analysis could not finish.",
              });
            }
            return;
          }

          if (
            req.method === "POST" &&
            path === "/upload-analyze"
          ) {
            let sessionRoot;
            try {
              const upload = safeUploadName(
                req.headers["x-m-bedrock-filename"],
              );
              sessionRoot = await mkdtemp(
                join(tmpdir(), "m-bedrock-review-upload-"),
              );
              const uploadedPath = join(
                sessionRoot,
                "artifact" + upload.extension,
              );
              await receiveArtifact(req, uploadedPath);
              const model =
                await loadReviewUiViewModel({
                  artifactPath: uploadedPath,
                  target: targetFromEnvironment(),
                });
              const record = await recentStore.persist(
                uploadedPath,
                {
                  id: model.artifact.id,
                  label: upload.name,
                  targetLabel: model.artifact.targetLabel,
                  attentionCount: model.attentionCount,
                },
              );
              await historyStore.recordAnalysis({
                artifactId: model.artifact.id,
                trigger: "file-open",
                attentionCount: model.attentionCount,
                targetLabel: model.artifact.targetLabel,
              });
              sendJson(res, 200, {
                model,
                record,
              });
            } catch (error) {
              const message =
                error instanceof Error &&
                error.message.trim()
                  ? error.message.trim()
                  : "Map could not be opened.";
              const status =
                /filename|\.mcworld|\.zip|empty|1 GB/.test(
                  message,
                )
                  ? 400
                  : 500;
              sendJson(res, status, {
                error: message,
              });
            } finally {
              if (sessionRoot) {
                await rm(sessionRoot, {
                  recursive: true,
                  force: true,
                });
              }
            }
            return;
          }

          next();
        },
      );
    },
  };
}

export default defineConfig({
  root: appRoot,
  plugins: [
    svelte(),
    reviewRuntimePlugin(),
  ],
  build: {
    outDir,
    emptyOutDir: true,
  },
});
