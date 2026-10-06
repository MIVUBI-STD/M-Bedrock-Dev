import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const failures = [];
const domains = ["product", "artifacts", "analysis", "repair", "validation", "system"];

for (const domain of domains) {
  const dir = join("docs", domain);
  const router = join(dir, "README.md");

  if (!existsSync(router)) {
    failures.push("Missing documentation router: " + router);
    continue;
  }

  const routerText = readFileSync(router, "utf8");
  const files = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
    .map((entry) => entry.name)
    .sort();

  for (const file of files) {
    const relativeLink = "./" + file;
    if (!routerText.includes(relativeLink)) {
      failures.push(router + " does not route substantive document: " + relativeLink);
    }
  }
}

const rootRouter = "docs/README.md";
if (!existsSync(rootRouter)) {
  failures.push("Missing root documentation router: " + rootRouter);
} else {
  const text = readFileSync(rootRouter, "utf8");
  for (const domain of domains) {
    const route = "./" + domain + "/README.md";
    if (!text.includes(route)) {
      failures.push(rootRouter + " does not route documentation domain: " + route);
    }
  }
}

if (failures.length) {
  console.error("Documentation routing violations:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Documentation routing verification passed.");
