import { readFileSync, writeFileSync } from "node:fs";

const inputPath =
  process.argv[2] ??
  "engine/reliability/catalogs/capability-truth/current.json";
const outputPath =
  process.argv[3] ??
  "engine/reliability/catalogs/capability-truth/proof-binding-backlog.md";

const truth = JSON.parse(readFileSync(inputPath, "utf8"));
const pending = (truth.taskCapabilities ?? [])
  .filter((item) => item.proofBinding?.state !== "bound")
  .sort((a, b) =>
    Number(b.runtimeOnly) - Number(a.runtimeOnly) ||
    String(a.owner).localeCompare(String(b.owner)) ||
    String(a.id).localeCompare(String(b.id))
  );

const lines = [
  "# Capability Proof Binding Backlog",
  "",
  "Generated from Capability Truth. This is a development backlog, not a test result.",
  "",
  "A capability appears here when no capability-specific regression/proof artifact is explicitly bound.",
  "",
];

for (const item of pending) {
  lines.push(
    "## " + item.id,
    "",
    "- Owner: " + item.owner,
    "- Capability status: " + item.status,
    "- Runtime only: " + String(item.runtimeOnly),
    "- Suggested proof context: " + (item.runtimeOnly ? "LOCAL_MINECRAFT / LIVE_MINECRAFT" : "REMOTE_GITHUB or stronger"),
    ""
  );
}

if (pending.length === 0) lines.push("No unbound capabilities.", "");

writeFileSync(outputPath, lines.join("\n"));
console.log("Capability proof-binding backlog written: " + outputPath);
