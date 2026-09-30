import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  campaignHistoryIdentity,
  validateCampaignHistoryRecord,
  type CampaignHistoryRecord,
} from "./campaign-history.js";

export interface PersistCampaignHistoryResult {
  id: string;
  path: string;
  written: boolean;
}

function safeFilePart(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, "_");
}

export async function persistCampaignHistoryRecord(
  directory: string,
  record: CampaignHistoryRecord,
): Promise<PersistCampaignHistoryResult> {
  const errors = validateCampaignHistoryRecord(record);
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  await mkdir(directory, { recursive: true });

  const id = campaignHistoryIdentity(record);
  const filename = `${safeFilePart(record.createdAt)}-${safeFilePart(record.campaignId)}-${id}.json`;
  const path = join(directory, filename);

  try {
    const existing = await readFile(path, "utf8");
    const parsed = JSON.parse(existing) as CampaignHistoryRecord;
    if (campaignHistoryIdentity(parsed) !== id) {
      throw new Error("Existing campaign history file content does not match its immutable identity.");
    }
    return { id, path, written: false };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : undefined;
    if (code !== "ENOENT") {
      if (error instanceof SyntaxError) {
        throw new Error("Existing campaign history file contains invalid JSON.");
      }
      if (error instanceof Error && !error.message.includes("ENOENT")) throw error;
    }
  }

  await writeFile(path, JSON.stringify(record, null, 2) + "\n", {
    encoding: "utf8",
    flag: "wx",
  });

  return { id, path, written: true };
}

export async function loadCampaignHistoryDirectory(
  directory: string,
): Promise<CampaignHistoryRecord[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const records: CampaignHistoryRecord[] = [];
  const identities = new Set<string>();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

    const path = join(directory, entry.name);
    const parsed = JSON.parse(await readFile(path, "utf8")) as CampaignHistoryRecord;
    const errors = validateCampaignHistoryRecord(parsed);
    if (errors.length > 0) {
      throw new Error(`Invalid campaign history file ${entry.name}: ${errors.join("; ")}`);
    }

    const id = campaignHistoryIdentity(parsed);
    if (!entry.name.includes(id)) {
      throw new Error(`Campaign history filename/content identity mismatch: ${entry.name}`);
    }
    if (identities.has(id)) {
      throw new Error(`Duplicate campaign history identity: ${id}`);
    }

    identities.add(id);
    records.push(parsed);
  }

  return records.sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt) ||
    a.campaignId.localeCompare(b.campaignId),
  );
}
