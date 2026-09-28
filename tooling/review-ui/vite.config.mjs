import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import {
  loadReviewUiViewModel,
} from "../../apps/review-ui/src/load-review.ts";

const appRoot = fileURLToPath(
  new URL("../../apps/review-ui/", import.meta.url),
);
const outDir = fileURLToPath(
  new URL("../../dist/review-ui/", import.meta.url),
);

function sendJson(res, statusCode, value) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(value));
}

function reviewRuntimePlugin() {
  const artifactPath =
    process.env.M_BEDROCK_REVIEW_ARTIFACT?.trim();
  const edition =
    process.env.M_BEDROCK_REVIEW_EDITION?.trim();
  const version =
    process.env.M_BEDROCK_REVIEW_VERSION?.trim();

  return {
    name: "m-bedrock-review-runtime",
    configureServer(server) {
      server.middlewares.use(
        "/__m-bedrock/review",
        async (req, res, next) => {
          const path = req.url?.split("?")[0];

          if (req.method === "GET" && path === "/info") {
            sendJson(res, 200, {
              configured: Boolean(artifactPath),
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
                  "No development artifact is configured. Set M_BEDROCK_REVIEW_ARTIFACT before starting the Review UI dev server.",
              });
              return;
            }

            try {
              const target = {
                ...(edition === "bedrock" ||
                edition === "education"
                  ? { edition }
                  : {}),
                ...(version ? { version } : {}),
              };
              const model =
                await loadReviewUiViewModel({
                  artifactPath,
                  target,
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
