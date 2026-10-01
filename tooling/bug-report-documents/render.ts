import {
  readFile,
  writeFile,
  mkdtemp,
  rm,
} from "node:fs/promises";
import {
  spawn,
} from "node:child_process";
import {
  tmpdir,
} from "node:os";
import {
  join,
  resolve,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";
import {
  parseBugReportV2Json,
  projectBugReportClientDocument,
  reviewBugReportClientDocument,
} from "../../engine/packages/bug-report/src/index.js";

interface Args {
  readonly input: string;
  readonly outDir: string;
  readonly includeFixed: boolean;
  readonly pdf: boolean;
}

function parseArgs(argv: readonly string[]): Args {
  let input = "";
  let outDir = "";
  let includeFixed = false;
  let pdf = true;

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--input") {
      input = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (value === "--out") {
      outDir = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (value === "--include-fixed") {
      includeFixed = true;
      continue;
    }
    if (value === "--docx-only") {
      pdf = false;
      continue;
    }
    throw new Error(
      "Unknown argument: " + value,
    );
  }

  if (!input) {
    throw new Error(
      "Missing --input <canonical Bug Report V2 JSON>.",
    );
  }
  if (!outDir) {
    throw new Error(
      "Missing --out <output directory>.",
    );
  }

  return {
    input: resolve(input),
    outDir: resolve(outDir),
    includeFixed,
    pdf,
  };
}

function safeSegment(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9._ -]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Map";
}

function run(
  command: string,
  args: readonly string[],
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      command,
      args,
      {
        stdio: "inherit",
        shell: false,
      },
    );
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(
        new Error(
          command +
            " exited with code " +
            String(code) +
            ".",
        ),
      );
    });
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const source = await readFile(
    args.input,
    "utf8",
  );
  const parsed = parseBugReportV2Json(source);
  if (!parsed.ok) {
    throw new Error(
      "Input is not valid Bug Report V2: " +
        parsed.issues
          .map((issue) =>
            issue.path + ": " + issue.message
          )
          .join("; "),
    );
  }

  const document =
    projectBugReportClientDocument(
      parsed.report,
      {
        includeFixed: args.includeFixed,
      },
    );
  const quality =
    reviewBugReportClientDocument(document);
  if (quality.length > 0) {
    throw new Error(
      "Client document is not render-ready: " +
        quality
          .map((issue) =>
            issue.path + ": " + issue.message
          )
          .join("; "),
    );
  }

  const stem =
    safeSegment(parsed.report.map.name) +
    " v" +
    safeSegment(parsed.report.map.mapVersion) +
    " - Bug Report";

  const work = await mkdtemp(
    join(tmpdir(), "m-bedrock-report-"),
  );
  try {
    const projectionPath =
      join(work, "client-document.json");
    await writeFile(
      projectionPath,
      JSON.stringify(document, null, 2) + "\n",
      "utf8",
    );

    const pythonRenderer = fileURLToPath(
      new URL(
        "./render_docx.py",
        import.meta.url,
      ),
    );

    const rendererArgs = [
      pythonRenderer,
      "--input",
      projectionPath,
      "--out",
      args.outDir,
      "--name",
      stem,
    ];
    if (args.pdf) {
      rendererArgs.push("--pdf");
    }

    await run("python", rendererArgs);
  } finally {
    await rm(
      work,
      {
        recursive: true,
        force: true,
      },
    );
  }
}

await main();
