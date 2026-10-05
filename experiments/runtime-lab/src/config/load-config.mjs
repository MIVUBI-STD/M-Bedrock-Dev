import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function readJson(relativePath) {
  const raw = await readFile(path.join(root, relativePath), "utf8");
  return JSON.parse(raw);
}

export async function loadLabConfig() {
  const [clients, profile, thresholds] = await Promise.all([
    readJson("config/clients.json"),
    readJson("config/profiles/interactive-low.json"),
    readJson("config/health-thresholds.json")
  ]);

  return {
    clients: clients.clients,
    profiles: { [profile.id]: profile },
    thresholds
  };
}

export async function loadScenario(id) {
  const allowed = new Set(["multiplayer-basic", "multi-arena-4p"]);
  if (!allowed.has(id)) {
    throw new Error(`Unknown scenario: ${id}`);
  }
  return readJson(`config/scenarios/${id}.json`);
}
