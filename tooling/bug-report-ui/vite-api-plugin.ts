import type {
  IncomingMessage,
  ServerResponse,
} from "node:http";
import {
  GitHubBugReportStore,
} from "./github-report-store.js";
import {
  handleBugReportStoreRequest,
} from "./github-report-handler.js";
import {
  GoogleBugReportPublicationProvider,
} from "./google-publication-provider.js";

interface ViteDevServerLike {
  readonly middlewares: {
    use(
      handler: (
        req: IncomingMessage,
        res: ServerResponse,
        next: () => void,
      ) => void,
    ): void;
  };
}

interface VitePluginLike {
  readonly name: string;
  configureServer(server: ViteDevServerLike): void;
  configurePreviewServer(
    server: ViteDevServerLike,
  ): void;
}

function env(
  name: string,
  fallback?: string,
): string | undefined {
  const value = process.env[name]?.trim();
  return value || fallback;
}

async function requestBody(
  req: IncomingMessage,
): Promise<Uint8Array | undefined> {
  if (
    req.method === "GET" ||
    req.method === "HEAD"
  ) {
    return undefined;
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(
      typeof chunk === "string"
        ? Buffer.from(chunk)
        : chunk,
    );
  }
  if (chunks.length === 0) return undefined;
  return Buffer.concat(chunks);
}

async function toFetchRequest(
  req: IncomingMessage,
): Promise<Request> {
  const host =
    req.headers.host ?? "localhost";
  const url =
    new URL(
      req.url ?? "/",
      "http://" + host,
    );

  const headers = new Headers();
  for (
    const [key, value] of
      Object.entries(req.headers)
  ) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((item) =>
        headers.append(key, item)
      );
    } else {
      headers.set(key, value);
    }
  }

  const body = await requestBody(req);
  return new Request(url, {
    method: req.method ?? "GET",
    headers,
    ...(body === undefined
      ? {}
      : { body }),
  });
}

async function writeFetchResponse(
  response: Response,
  res: ServerResponse,
): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach(
    (value, key) => {
      res.setHeader(key, value);
    },
  );

  const body =
    new Uint8Array(
      await response.arrayBuffer(),
    );
  res.end(Buffer.from(body));
}

function unavailable(
  res: ServerResponse,
  message: string,
): void {
  res.statusCode = 503;
  res.setHeader(
    "Content-Type",
    "application/json",
  );
  res.end(JSON.stringify({ error: message }));
}

export function bugReportApiPlugin():
  VitePluginLike {
  const githubToken =
    env("M_BEDROCK_GITHUB_TOKEN");
  const owner =
    env(
      "M_BEDROCK_GITHUB_OWNER",
      "MIVUBI-STD",
    )!;
  const repository =
    env(
      "M_BEDROCK_GITHUB_REPOSITORY",
      "M-Bedrock-Dev",
    )!;
  const branch =
    env(
      "M_BEDROCK_GITHUB_BRANCH",
      "Local",
    )!;
  const googleToken =
    env("M_BEDROCK_GOOGLE_ACCESS_TOKEN");

  const store = githubToken
    ? new GitHubBugReportStore({
        owner,
        repository,
        branch,
        token: githubToken,
      })
    : undefined;

  const publicationProvider =
    googleToken
      ? new GoogleBugReportPublicationProvider({
          accessToken: googleToken,
        })
      : undefined;

  const mount = (
    server: ViteDevServerLike,
  ): void => {
    server.middlewares.use(
      (req, res, next) => {
        const path =
          new URL(
            req.url ?? "/",
            "http://localhost",
          ).pathname;

        if (
          !path.startsWith(
            "/api/bug-report",
          )
        ) {
          next();
          return;
        }

        if (!store) {
          unavailable(
            res,
            "Bug report GitHub backend is not configured. Set M_BEDROCK_GITHUB_TOKEN.",
          );
          return;
        }

        void (async () => {
          try {
            const request =
              await toFetchRequest(req);
            const response =
              await handleBugReportStoreRequest(
                request,
                store,
                publicationProvider,
              );
            await writeFetchResponse(
              response,
              res,
            );
          } catch (error) {
            res.statusCode = 500;
            res.setHeader(
              "Content-Type",
              "application/json",
            );
            res.end(JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : String(error),
            }));
          }
        })();
      },
    );
  };

  return {
    name: "m-bedrock-bug-report-api",
    configureServer: mount,
    configurePreviewServer: mount,
  };
}
