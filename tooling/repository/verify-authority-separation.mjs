import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const failures=[];
for (const name of readdirSync("engine/knowledge")) {
  if (!name.endsWith(".json") || name==="ownership.json") continue;
  if (name.endsWith("-policy.json")) failures.push("Platform knowledge may not contain policy catalog: "+name);
  const catalog=JSON.parse(readFileSync(join("engine/knowledge",name),"utf8"));
  for (const source of catalog.sources ?? []) if (source.authority==="project-policy") failures.push("Platform knowledge may not use project-policy authority: "+name+"#"+source.id);
  for (const item of [...(catalog.facts ?? []),...(catalog.relations ?? [])]) if (item.classification==="project-policy") failures.push("Platform knowledge may not contain project-policy item: "+name+"#"+item.id);
}
for (const name of readdirSync("engine/contracts/engineering/catalogs")) {
  if (!name.endsWith(".json")) continue;
  const catalog=JSON.parse(readFileSync(join("engine/contracts/engineering/catalogs",name),"utf8"));
  if (!(catalog.sources ?? []).some((source)=>source.authority==="project-policy")) failures.push("Engineering contract lacks project-policy provenance: "+name);
  for (const item of [...(catalog.facts ?? []),...(catalog.relations ?? [])]) if (item.classification!=="project-policy") failures.push("Engineering contract item must be project-policy classified: "+name+"#"+item.id);
}
if (failures.length) {
  console.error("Semantic authority separation violations:");
  for (const failure of failures) console.error("- "+failure);
  process.exit(1);
}
console.log("Semantic authority separation verification passed.");
