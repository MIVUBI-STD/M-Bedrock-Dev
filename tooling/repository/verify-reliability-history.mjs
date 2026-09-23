import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const directory = "reliability/history";
if (!existsSync(directory)) process.exit(0);

function identity(record) {
  return "campaign_" + createHash("sha256")
    .update(JSON.stringify({
      campaignId: record.campaignId,
      createdAt: record.createdAt,
      mapId: record.mapId ?? null,
      minecraftVersion: record.minecraftVersion ?? null,
      artifactFingerprint: record.artifactFingerprint ?? null,
      reliabilityFingerprintId: record.reliabilityFingerprintId ?? null,
      mutationReport: record.mutationReport ?? null,
      blindspotTasks: record.blindspotTasks,
      notes: record.notes ?? [],
    }))
    .digest("hex")
    .slice(0, 20);
}

const seen = new Set();
for (const name of readdirSync(directory)) {
  if (!name.endsWith(".json")) continue;
  const record = JSON.parse(readFileSync(join(directory, name), "utf8"));
  if (record.schemaVersion !== 1 || !record.campaignId || !record.createdAt) {
    throw new Error(`Invalid campaign history record: ${name}`);
  }
  const id = identity(record);
  if (!name.includes(id)) {
    throw new Error(`Campaign history filename/content identity mismatch: ${name}`);
  }
  if (seen.has(id)) throw new Error(`Duplicate campaign history identity: ${id}`);
  seen.add(id);
}

console.log(`Reliability history verification passed (${seen.size} records).`);
